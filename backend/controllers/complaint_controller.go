package controllers

import (
	"fmt"
	"recall-tracking/models"
	"recall-tracking/pkg/response"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ComplaintCreateRequest struct {
	ModelID          uint64 `json:"model_id" binding:"required"`
	VIN              string `json:"vin"`
	ComplaintType    string `json:"complaint_type" binding:"required"`
	FaultDescription string `json:"fault_description" binding:"required"`
	FaultLocation    string `json:"fault_location"`
	OccurrenceTime   string `json:"occurrence_time"`
	Mileage          int    `json:"mileage"`
	ReporterName     string `json:"reporter_name"`
	ReporterType     string `json:"reporter_type"`
	SampleType       string `json:"sample_type"`
	AnalysisResult   string `json:"analysis_result"`
	IsDefect         int    `json:"is_defect"`
}

type ComplaintUpdateRequest struct {
	ComplaintType    string `json:"complaint_type"`
	FaultDescription string `json:"fault_description"`
	FaultLocation    string `json:"fault_location"`
	OccurrenceTime   string `json:"occurrence_time"`
	Mileage          int    `json:"mileage"`
	AnalysisResult   string `json:"analysis_result"`
	IsDefect         int    `json:"is_defect"`
	Status           int    `json:"status"`
}

func generateComplaintNo() string {
	return "CP" + time.Now().Format("20060102") + uuid.New().String()[:8]
}

func CreateComplaint(c *gin.Context) {
	var req ComplaintCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}

	engineerID, _ := c.Get("user_id")
	engineerName, _ := c.Get("real_name")

	var model models.VehicleModel
	if err := models.DB.Where("id = ?", req.ModelID).First(&model).Error; err != nil {
		response.NotFound(c, "车型不存在")
		return
	}

	var vehicleVIN models.VehicleVIN
	if req.VIN != "" {
		if err := models.DB.Where("vin = ?", req.VIN).First(&vehicleVIN).Error; err != nil {
			response.BadRequest(c, "VIN码不存在")
			return
		}
	}

	var occurrenceTime time.Time
	if req.OccurrenceTime != "" {
		parsed, err := time.Parse("2006-01-02 15:04:05", req.OccurrenceTime)
		if err == nil {
			occurrenceTime = parsed
		}
	}

	complaint := models.Complaint{
		ComplaintNo:       generateComplaintNo(),
		ModelID:           req.ModelID,
		VIN:               req.VIN,
		ComplaintType:     req.ComplaintType,
		FaultDescription:  req.FaultDescription,
		FaultLocation:     req.FaultLocation,
		OccurrenceTime:    occurrenceTime,
		Mileage:           req.Mileage,
		ReporterName:      req.ReporterName,
		ReporterType:      req.ReporterType,
		QualityEngineerID: engineerID.(uint64),
		QualityEngineerName: engineerName.(string),
		SampleType:        req.SampleType,
		AnalysisResult:    req.AnalysisResult,
		IsDefect:          req.IsDefect,
		Status:            0,
	}

	if err := models.DB.Create(&complaint).Error; err != nil {
		response.InternalServerError(c, "创建投诉记录失败: "+err.Error())
		return
	}

	models.DB.Preload("Model").First(&complaint, complaint.ID)

	response.Success(c, complaint)
}

func GetComplaintList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	modelID := c.Query("model_id")
	status := c.Query("status")
	isDefect := c.Query("is_defect")
	complaintType := c.Query("complaint_type")
	keyword := c.Query("keyword")

	query := models.DB.Model(&models.Complaint{}).Preload("Model")

	if modelID != "" {
		query = query.Where("model_id = ?", modelID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if isDefect != "" {
		query = query.Where("is_defect = ?", isDefect)
	}
	if complaintType != "" {
		query = query.Where("complaint_type = ?", complaintType)
	}
	if keyword != "" {
		query = query.Where("complaint_no LIKE ? OR fault_description LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	var total int64
	query.Count(&total)

	var complaints []models.Complaint
	offset := (page - 1) * pageSize
	query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&complaints)

	response.SuccessWithPage(c, complaints, total, page, pageSize)
}

func GetComplaintDetail(c *gin.Context) {
	id := c.Param("id")

	var complaint models.Complaint
	if err := models.DB.Preload("Model").Where("id = ?", id).First(&complaint).Error; err != nil {
		response.NotFound(c, "投诉记录不存在")
		return
	}

	response.Success(c, complaint)
}

func UpdateComplaint(c *gin.Context) {
	id := c.Param("id")

	var req ComplaintUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}

	var complaint models.Complaint
	if err := models.DB.Where("id = ?", id).First(&complaint).Error; err != nil {
		response.NotFound(c, "投诉记录不存在")
		return
	}

	updates := make(map[string]interface{})
	if req.ComplaintType != "" {
		updates["complaint_type"] = req.ComplaintType
	}
	if req.FaultDescription != "" {
		updates["fault_description"] = req.FaultDescription
	}
	if req.FaultLocation != "" {
		updates["fault_location"] = req.FaultLocation
	}
	if req.AnalysisResult != "" {
		updates["analysis_result"] = req.AnalysisResult
	}
	if req.Mileage > 0 {
		updates["mileage"] = req.Mileage
	}
	if req.OccurrenceTime != "" {
		parsed, err := time.Parse("2006-01-02 15:04:05", req.OccurrenceTime)
		if err == nil {
			updates["occurrence_time"] = parsed
		}
	}
	if req.IsDefect >= 0 {
		updates["is_defect"] = req.IsDefect
	}
	if req.Status >= 0 {
		updates["status"] = req.Status
	}

	if err := models.DB.Model(&complaint).Updates(updates).Error; err != nil {
		response.InternalServerError(c, "更新投诉记录失败: "+err.Error())
		return
	}

	models.DB.Preload("Model").First(&complaint, id)
	response.Success(c, complaint)
}

func DeleteComplaint(c *gin.Context) {
	id := c.Param("id")

	var complaint models.Complaint
	if err := models.DB.Where("id = ?", id).First(&complaint).Error; err != nil {
		response.NotFound(c, "投诉记录不存在")
		return
	}

	if complaint.RelatedRecallID > 0 {
		response.BadRequest(c, "该投诉已关联召回，无法删除")
		return
	}

	if err := models.DB.Delete(&complaint).Error; err != nil {
		response.InternalServerError(c, "删除投诉记录失败: "+err.Error())
		return
	}

	response.Success(c, nil)
}

func GetDefectStatistics(c *gin.Context) {
	modelID := c.Query("model_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	newQuery := func() *gorm.DB {
		q := models.DB.Session(&gorm.Session{}).Model(&models.Complaint{})
		if modelID != "" {
			q = q.Where("model_id = ?", modelID)
		}
		if startDate != "" {
			q = q.Where("created_at >= ?", startDate)
		}
		if endDate != "" {
			q = q.Where("created_at <= ?", endDate)
		}
		return q
	}

	type StatResult struct {
		ComplaintType string `json:"complaint_type"`
		Count         int64  `json:"count"`
		DefectCount   int64  `json:"defect_count"`
	}

	var stats []StatResult
	newQuery().Select("complaint_type, COUNT(*) as count, SUM(is_defect) as defect_count").
		Group("complaint_type").
		Scan(&stats)

	var total int64
	newQuery().Count(&total)

	var defectTotal int64
	newQuery().Where("is_defect = 1").Count(&defectTotal)

	result := map[string]interface{}{
		"total":        total,
		"defect_total": defectTotal,
		"by_type":      stats,
		"defect_rate":  fmt.Sprintf("%.2f%%", response.SafePercent(float64(defectTotal), float64(total))),
	}

	response.Success(c, result)
}
