package controllers

import (
	"recall-tracking/models"
	"recall-tracking/pkg/response"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RecallCreateRequest struct {
	ModelID             uint64   `json:"model_id" binding:"required"`
	DefectDescription   string   `json:"defect_description" binding:"required"`
	DefectCause         string   `json:"defect_cause"`
	RiskDescription     string   `json:"risk_description"`
	VINStart            string   `json:"vin_start"`
	VINEnd              string   `json:"vin_end"`
	ProductionStartDate string   `json:"production_start_date"`
	ProductionEndDate   string   `json:"production_end_date"`
	MinComplaintThreshold int    `json:"min_complaint_threshold"`
	RepairMeasure       string   `json:"repair_measure"`
	EstimatedCost       float64  `json:"estimated_cost"`
	RelatedComplaintIDs []uint64 `json:"related_complaint_ids"`
}

type RecallConfirmRequest struct {
	Status int `json:"status" binding:"required,oneof=2 3"`
}

type RecallPublishRequest struct {
	VINList []string `json:"vin_list"`
}

func generateRecallNo() string {
	return "RC" + time.Now().Format("20060102") + strings.ToUpper(uuid.New().String()[:8])
}

func CreateRecall(c *gin.Context) {
	var req RecallCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}

	var model models.VehicleModel
	if err := models.DB.Where("id = ?", req.ModelID).First(&model).Error; err != nil {
		response.NotFound(c, "车型不存在")
		return
	}

	minThreshold := req.MinComplaintThreshold
	if minThreshold <= 0 {
		minThreshold = 5
	}

	var productionStartDate, productionEndDate time.Time
	if req.ProductionStartDate != "" {
		parsed, err := time.Parse("2006-01-02", req.ProductionStartDate)
		if err == nil {
			productionStartDate = parsed
		}
	}
	if req.ProductionEndDate != "" {
		parsed, err := time.Parse("2006-01-02", req.ProductionEndDate)
		if err == nil {
			productionEndDate = parsed
		}
	}

	vinQuery := models.DB.Model(&models.VehicleVIN{}).Where("model_id = ?", req.ModelID)
	if req.VINStart != "" {
		vinQuery = vinQuery.Where("vin >= ?", req.VINStart)
	}
	if req.VINEnd != "" {
		vinQuery = vinQuery.Where("vin <= ?", req.VINEnd)
	}
	if !productionStartDate.IsZero() {
		vinQuery = vinQuery.Where("production_date >= ?", productionStartDate)
	}
	if !productionEndDate.IsZero() {
		vinQuery = vinQuery.Where("production_date <= ?", productionEndDate)
	}

	var vinCount int64
	vinQuery.Count(&vinCount)

	complaintQuery := models.DB.Model(&models.Complaint{}).
		Where("model_id = ? AND is_defect = 1 AND status = 1", req.ModelID)
	var complaintCount int64
	complaintQuery.Count(&complaintCount)

	recall := models.RecallScope{
		RecallNo:             generateRecallNo(),
		ModelID:              req.ModelID,
		DefectDescription:    req.DefectDescription,
		DefectCause:          req.DefectCause,
		RiskDescription:      req.RiskDescription,
		VINStart:             req.VINStart,
		VINEnd:               req.VINEnd,
		ProductionStartDate:  productionStartDate,
		ProductionEndDate:    productionEndDate,
		VINCount:             int(vinCount),
		ComplaintCount:       int(complaintCount),
		MinComplaintThreshold: minThreshold,
		RepairMeasure:        req.RepairMeasure,
		EstimatedCost:        req.EstimatedCost,
		Status:               1,
	}

	err := models.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&recall).Error; err != nil {
			return err
		}

		if len(req.RelatedComplaintIDs) > 0 {
			if err := tx.Model(&models.Complaint{}).
				Where("id IN ?", req.RelatedComplaintIDs).
				Update("related_recall_id", recall.ID).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		response.InternalServerError(c, "创建召回范围失败: "+err.Error())
		return
	}

	models.DB.Preload("Model").First(&recall, recall.ID)

	response.Success(c, gin.H{
		"recall":          recall,
		"can_confirm":     complaintCount >= int64(minThreshold),
		"complaint_count": complaintCount,
		"min_threshold":   minThreshold,
	})
}

func GetRecallList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	modelID := c.Query("model_id")
	status := c.Query("status")
	keyword := c.Query("keyword")

	query := models.DB.Model(&models.RecallScope{}).Preload("Model")

	if modelID != "" {
		query = query.Where("model_id = ?", modelID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if keyword != "" {
		query = query.Where("recall_no LIKE ? OR defect_description LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	var total int64
	query.Count(&total)

	var recalls []models.RecallScope
	offset := (page - 1) * pageSize
	query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&recalls)

	response.SuccessWithPage(c, recalls, total, page, pageSize)
}

func GetRecallDetail(c *gin.Context) {
	id := c.Param("id")

	var recall models.RecallScope
	if err := models.DB.Preload("Model").Preload("RecallVINs").
		Where("id = ?", id).First(&recall).Error; err != nil {
		response.NotFound(c, "召回范围不存在")
		return
	}

	var relatedComplaints []models.Complaint
	models.DB.Where("related_recall_id = ?", id).Find(&relatedComplaints)

	var vinList []models.VehicleVIN
	vinQuery := models.DB.Where("model_id = ?", recall.ModelID)
	if recall.VINStart != "" {
		vinQuery = vinQuery.Where("vin >= ?", recall.VINStart)
	}
	if recall.VINEnd != "" {
		vinQuery = vinQuery.Where("vin <= ?", recall.VINEnd)
	}
	if !recall.ProductionStartDate.IsZero() {
		vinQuery = vinQuery.Where("production_date >= ?", recall.ProductionStartDate)
	}
	if !recall.ProductionEndDate.IsZero() {
		vinQuery = vinQuery.Where("production_date <= ?", recall.ProductionEndDate)
	}
	vinQuery.Limit(100).Find(&vinList)

	response.Success(c, gin.H{
		"recall":              recall,
		"related_complaints":  relatedComplaints,
		"affected_vins":       vinList,
		"can_confirm":         recall.ComplaintCount >= recall.MinComplaintThreshold,
	})
}

func ConfirmRecall(c *gin.Context) {
	id := c.Param("id")

	var req RecallConfirmRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}

	officerID, _ := c.Get("user_id")
	officerName, _ := c.Get("real_name")

	var recall models.RecallScope
	if err := models.DB.Where("id = ?", id).First(&recall).Error; err != nil {
		response.NotFound(c, "召回范围不存在")
		return
	}

	if recall.Status != 1 {
		response.BadRequest(c, "当前状态不允许确认操作")
		return
	}

	if req.Status == 2 {
		if recall.ComplaintCount < recall.MinComplaintThreshold {
			response.BadRequest(c, "投诉样本不足，当前投诉样本数为 "+
				strconv.Itoa(recall.ComplaintCount)+
				"，最小阈值为 "+strconv.Itoa(recall.MinComplaintThreshold)+
				"，请先收集足够的投诉样本后再确认召回")
			return
		}
	}

	updates := make(map[string]interface{})
	updates["status"] = req.Status
	updates["regulation_officer_id"] = officerID.(uint64)
	updates["regulation_officer_name"] = officerName.(string)

	if req.Status == 2 {
		updates["confirmed_at"] = time.Now()
	}

	if err := models.DB.Model(&recall).Updates(updates).Error; err != nil {
		response.InternalServerError(c, "确认召回失败: "+err.Error())
		return
	}

	models.DB.Preload("Model").First(&recall, id)
	response.Success(c, recall)
}

func PublishRecall(c *gin.Context) {
	id := c.Param("id")

	var recall models.RecallScope
	if err := models.DB.Where("id = ?", id).First(&recall).Error; err != nil {
		response.NotFound(c, "召回范围不存在")
		return
	}

	if recall.Status != 2 {
		response.BadRequest(c, "只有已确认的召回才能发布")
		return
	}

	err := models.DB.Transaction(func(tx *gorm.DB) error {
		vinQuery := tx.Model(&models.VehicleVIN{}).Where("model_id = ?", recall.ModelID)
		if recall.VINStart != "" {
			vinQuery = vinQuery.Where("vin >= ?", recall.VINStart)
		}
		if recall.VINEnd != "" {
			vinQuery = vinQuery.Where("vin <= ?", recall.VINEnd)
		}
		if !recall.ProductionStartDate.IsZero() {
			vinQuery = vinQuery.Where("production_date >= ?", recall.ProductionStartDate)
		}
		if !recall.ProductionEndDate.IsZero() {
			vinQuery = vinQuery.Where("production_date <= ?", recall.ProductionEndDate)
		}

		var vins []models.VehicleVIN
		if err := vinQuery.Find(&vins).Error; err != nil {
			return err
		}

		for _, vin := range vins {
			recallVIN := models.RecallVIN{
				RecallID:  recall.ID,
				VINID:     vin.ID,
				VIN:       vin.VIN,
				IsInScope: 1,
			}
			if err := tx.Create(&recallVIN).Error; err != nil {
				return err
			}
		}

		if err := tx.Model(&recall).Updates(map[string]interface{}{
			"status":       4,
			"published_at": time.Now(),
			"vin_count":    len(vins),
		}).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		response.InternalServerError(c, "发布召回失败: "+err.Error())
		return
	}

	models.DB.Preload("Model").First(&recall, id)
	response.Success(c, recall)
}

func GetRecallAffectedVINs(c *gin.Context) {
	recallID := c.Param("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	vinKeyword := c.Query("vin")
	ownerKeyword := c.Query("owner")

	var recall models.RecallScope
	if err := models.DB.Where("id = ?", recallID).First(&recall).Error; err != nil {
		response.NotFound(c, "召回范围不存在")
		return
	}

	query := models.DB.Model(&models.VehicleVIN{}).Where("model_id = ?", recall.ModelID)
	if recall.VINStart != "" {
		query = query.Where("vin >= ?", recall.VINStart)
	}
	if recall.VINEnd != "" {
		query = query.Where("vin <= ?", recall.VINEnd)
	}
	if !recall.ProductionStartDate.IsZero() {
		query = query.Where("production_date >= ?", recall.ProductionStartDate)
	}
	if !recall.ProductionEndDate.IsZero() {
		query = query.Where("production_date <= ?", recall.ProductionEndDate)
	}
	if vinKeyword != "" {
		query = query.Where("vin LIKE ?", "%"+vinKeyword+"%")
	}
	if ownerKeyword != "" {
		query = query.Where("owner_name LIKE ?", "%"+ownerKeyword+"%")
	}

	var total int64
	query.Count(&total)

	var vins []models.VehicleVIN
	offset := (page - 1) * pageSize
	query.Preload("Model").Order("vin ASC").Offset(offset).Limit(pageSize).Find(&vins)

	response.SuccessWithPage(c, vins, total, page, pageSize)
}

func UpdateRecall(c *gin.Context) {
	id := c.Param("id")

	var req RecallCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}

	var recall models.RecallScope
	if err := models.DB.Where("id = ?", id).First(&recall).Error; err != nil {
		response.NotFound(c, "召回范围不存在")
		return
	}

	if recall.Status >= 2 {
		response.BadRequest(c, "已确认的召回不能修改")
		return
	}

	updates := make(map[string]interface{})
	if req.DefectDescription != "" {
		updates["defect_description"] = req.DefectDescription
	}
	if req.DefectCause != "" {
		updates["defect_cause"] = req.DefectCause
	}
	if req.RiskDescription != "" {
		updates["risk_description"] = req.RiskDescription
	}
	if req.VINStart != "" {
		updates["vin_start"] = req.VINStart
	}
	if req.VINEnd != "" {
		updates["vin_end"] = req.VINEnd
	}
	if req.RepairMeasure != "" {
		updates["repair_measure"] = req.RepairMeasure
	}
	if req.EstimatedCost > 0 {
		updates["estimated_cost"] = req.EstimatedCost
	}
	if req.MinComplaintThreshold > 0 {
		updates["min_complaint_threshold"] = req.MinComplaintThreshold
	}

	if err := models.DB.Model(&recall).Updates(updates).Error; err != nil {
		response.InternalServerError(c, "更新召回失败: "+err.Error())
		return
	}

	models.DB.Preload("Model").First(&recall, id)
	response.Success(c, recall)
}
