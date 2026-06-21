package controllers

import (
	"os"
	"path/filepath"
	"recall-tracking/config"
	"recall-tracking/models"
	"recall-tracking/pkg/response"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RepairCreateRequest struct {
	RecallID          uint64   `json:"recall_id" binding:"required"`
	NotificationID    uint64   `json:"notification_id"`
	VINID             uint64   `json:"vin_id" binding:"required"`
	DealerID          uint64   `json:"dealer_id"`
	DealerName        string   `json:"dealer_name"`
	RepairType        string   `json:"repair_type"`
	RepairDescription string   `json:"repair_description"`
	RepairMeasure     string   `json:"repair_measure"`
	OldPartDisposal   string   `json:"old_part_disposal"`
	RepairStartTime   string   `json:"repair_start_time"`
	RepairEndTime     string   `json:"repair_end_time"`
	PartsUsed         string   `json:"parts_used"`
	LaborCost         float64  `json:"labor_cost"`
	PartsCost         float64  `json:"parts_cost"`
	Remark            string   `json:"remark"`
}

type RepairUpdateRequest struct {
	RepairStatus      int      `json:"repair_status" binding:"required,oneof=0 1 2 3"`
	RepairDescription string   `json:"repair_description"`
	RepairMeasure     string   `json:"repair_measure"`
	OldPartDisposal   string   `json:"old_part_disposal"`
	RepairStartTime   string   `json:"repair_start_time"`
	RepairEndTime     string   `json:"repair_end_time"`
	PartsUsed         string   `json:"parts_used"`
	LaborCost         float64  `json:"labor_cost"`
	PartsCost         float64  `json:"parts_cost"`
	QualityCheckResult string  `json:"quality_check_result"`
	Remark            string   `json:"remark"`
}

type AppointmentUpdateRequest struct {
	AppointmentStatus int    `json:"appointment_status" binding:"required,oneof=0 1 2 3"`
	AppointmentTime   string `json:"appointment_time"`
	ContactRemark     string `json:"contact_remark"`
}

type RepairCompleteRequest struct {
	RepairDescription string   `json:"repair_description"`
	RepairMeasure     string   `json:"repair_measure"`
	OldPartDisposal   string   `json:"old_part_disposal"`
	PartsUsed         string   `json:"parts_used"`
	LaborCost         float64  `json:"labor_cost"`
	PartsCost         float64  `json:"parts_cost"`
	Remark            string   `json:"remark"`
}

func generateRepairNo() string {
	return "RP" + time.Now().Format("20060102") + uuid.New().String()[:8]
}

func CreateRepair(c *gin.Context) {
	var req RepairCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}

	handlerID, _ := c.Get("user_id")
	handlerName, _ := c.Get("real_name")
	dealerID, _ := c.Get("dealer_id")

	var recall models.RecallScope
	if err := models.DB.Where("id = ?", req.RecallID).First(&recall).Error; err != nil {
		response.NotFound(c, "召回不存在")
		return
	}

	var vehicleVIN models.VehicleVIN
	if err := models.DB.Where("id = ?", req.VINID).First(&vehicleVIN).Error; err != nil {
		response.NotFound(c, "VIN不存在")
		return
	}

	if req.NotificationID > 0 {
		var notification models.Notification
		if err := models.DB.Where("id = ?", req.NotificationID).First(&notification).Error; err != nil {
			response.NotFound(c, "通知不存在")
			return
		}
	}

	var repairStartTime, repairEndTime time.Time
	if req.RepairStartTime != "" {
		parsed, err := time.Parse("2006-01-02 15:04:05", req.RepairStartTime)
		if err == nil {
			repairStartTime = parsed
		}
	}
	if req.RepairEndTime != "" {
		parsed, err := time.Parse("2006-01-02 15:04:05", req.RepairEndTime)
		if err == nil {
			repairEndTime = parsed
		}
	}

	totalCost := req.LaborCost + req.PartsCost

	var actualDealerID uint64
	if req.DealerID > 0 {
		actualDealerID = req.DealerID
	} else if did, ok := dealerID.(uint64); ok && did > 0 {
		actualDealerID = did
	}

	var dealerName string
	if req.DealerName != "" {
		dealerName = req.DealerName
	} else if actualDealerID > 0 {
		var dealer models.Dealer
		if err := models.DB.Where("id = ?", actualDealerID).First(&dealer).Error; err == nil {
			dealerName = dealer.DealerName
		}
	}

	repair := models.RepairRecord{
		RepairNo:          generateRepairNo(),
		RecallID:          req.RecallID,
		NotificationID:    req.NotificationID,
		VINID:             req.VINID,
		VIN:               vehicleVIN.VIN,
		ModelID:           vehicleVIN.ModelID,
		DealerID:          actualDealerID,
		DealerName:        dealerName,
		RepairType:        req.RepairType,
		RepairDescription: req.RepairDescription,
		RepairMeasure:     req.RepairMeasure,
		OldPartDisposal:   req.OldPartDisposal,
		RepairStartTime:   repairStartTime,
		RepairEndTime:     repairEndTime,
		RepairStatus:      0,
		AppointmentStatus: 0,
		HandlerID:         handlerID.(uint64),
		HandlerName:       handlerName.(string),
		PartsUsed:         req.PartsUsed,
		LaborCost:         req.LaborCost,
		PartsCost:         req.PartsCost,
		TotalCost:         totalCost,
		Remark:            req.Remark,
	}

	if err := models.DB.Create(&repair).Error; err != nil {
		response.InternalServerError(c, "创建维修记录失败: "+err.Error())
		return
	}

	models.DB.Preload("Recall").Preload("Notification").Preload("VehicleVIN").Preload("Model").
		First(&repair, repair.ID)

	response.Success(c, repair)
}

func UploadOldPartPhoto(c *gin.Context) {
	repairID := c.Param("id")

	var repair models.RepairRecord
	if err := models.DB.Where("id = ?", repairID).First(&repair).Error; err != nil {
		response.NotFound(c, "维修记录不存在")
		return
	}

	uploadPath := config.AppConfig.Upload.Path
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		response.InternalServerError(c, "创建上传目录失败")
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, "获取上传文件失败: "+err.Error())
		return
	}

	if file.Size > config.AppConfig.Upload.MaxSizeBytes {
		response.BadRequest(c, "文件大小超过限制")
		return
	}

	ext := filepath.Ext(file.Filename)
	newFileName := uuid.New().String() + ext
	filePath := filepath.Join(uploadPath, newFileName)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		response.InternalServerError(c, "保存文件失败: "+err.Error())
		return
	}

	fileURL := "/uploads/" + newFileName

	oldPhotos := repair.OldPartPhotos
	if oldPhotos == nil {
		oldPhotos = models.JSONStringArray{}
	}
	oldPhotos = append(oldPhotos, fileURL)

	if err := models.DB.Model(&repair).Update("old_part_photos", oldPhotos).Error; err != nil {
		os.Remove(filePath)
		response.InternalServerError(c, "更新照片失败: "+err.Error())
		return
	}

	response.Success(c, gin.H{
		"url":      fileURL,
		"filename": file.Filename,
	})
}

func GetRepairList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	recallID := c.Query("recall_id")
	repairStatus := c.Query("repair_status")
	vin := c.Query("vin")
	dealerID := c.Query("dealer_id")
	handlerID := c.Query("handler_id")

	currentDealerID, _ := c.Get("dealer_id")

	query := models.DB.Model(&models.RepairRecord{}).Preload("Recall").Preload("Notification").Preload("VehicleVIN").Preload("Model")

	if recallID != "" {
		query = query.Where("recall_id = ?", recallID)
	}
	if repairStatus != "" {
		query = query.Where("repair_status = ?", repairStatus)
	}
	if vin != "" {
		query = query.Where("vin LIKE ?", "%"+vin+"%")
	}
	if dealerID != "" {
		query = query.Where("dealer_id = ?", dealerID)
	} else if did, ok := currentDealerID.(uint64); ok && did > 0 {
		query = query.Where("dealer_id = ?", did)
	}
	if handlerID != "" {
		query = query.Where("handler_id = ?", handlerID)
	}

	var total int64
	query.Count(&total)

	var repairs []models.RepairRecord
	offset := (page - 1) * pageSize
	query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&repairs)

	response.SuccessWithPage(c, repairs, total, page, pageSize)
}

func GetRepairDetail(c *gin.Context) {
	id := c.Param("id")

	var repair models.RepairRecord
	if err := models.DB.Preload("Recall").Preload("Recall.Model").Preload("Notification").Preload("VehicleVIN").Preload("Model").
		Where("id = ?", id).First(&repair).Error; err != nil {
		response.NotFound(c, "维修记录不存在")
		return
	}

	response.Success(c, repair)
}

func UpdateRepair(c *gin.Context) {
	id := c.Param("id")

	var req RepairUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}

	qualityCheckerID, _ := c.Get("user_id")
	qualityCheckerName, _ := c.Get("real_name")

	var repair models.RepairRecord
	if err := models.DB.Where("id = ?", id).First(&repair).Error; err != nil {
		response.NotFound(c, "维修记录不存在")
		return
	}

	updates := make(map[string]interface{})
	updates["repair_status"] = req.RepairStatus

	if req.RepairDescription != "" {
		updates["repair_description"] = req.RepairDescription
	}
	if req.RepairMeasure != "" {
		updates["repair_measure"] = req.RepairMeasure
	}
	if req.OldPartDisposal != "" {
		updates["old_part_disposal"] = req.OldPartDisposal
	}
	if req.PartsUsed != "" {
		updates["parts_used"] = req.PartsUsed
	}
	if req.LaborCost >= 0 {
		updates["labor_cost"] = req.LaborCost
	}
	if req.PartsCost >= 0 {
		updates["parts_cost"] = req.PartsCost
		updates["total_cost"] = req.LaborCost + req.PartsCost
	}
	if req.Remark != "" {
		updates["remark"] = req.Remark
	}

	if req.RepairStartTime != "" {
		parsed, err := time.Parse("2006-01-02 15:04:05", req.RepairStartTime)
		if err == nil {
			updates["repair_start_time"] = parsed
		}
	}
	if req.RepairEndTime != "" {
		parsed, err := time.Parse("2006-01-02 15:04:05", req.RepairEndTime)
		if err == nil {
			updates["repair_end_time"] = parsed
		}
	}

	if req.RepairStatus == 2 && repair.RepairStatus != 2 {
		if len(repair.OldPartPhotos) == 0 {
			response.BadRequest(c, "维修完成前必须上传旧件照片")
			return
		}
		updates["repair_end_time"] = time.Now()
	}

	if err := models.DB.Model(&repair).Updates(updates).Error; err != nil {
		response.InternalServerError(c, "更新维修记录失败: "+err.Error())
		return
	}

	if req.RepairStatus == 2 {
		models.DB.Model(&models.VehicleVIN{}).Where("id = ?", repair.VINID).Update("status", 2)
	}

	models.DB.Preload("Recall").Preload("Notification").Preload("VehicleVIN").Preload("Model").
		First(&repair, id)
	response.Success(c, repair)
}

func CompleteRepair(c *gin.Context) {
	id := c.Param("id")

	var req RepairCompleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}

	var repair models.RepairRecord
	if err := models.DB.Where("id = ?", id).First(&repair).Error; err != nil {
		response.NotFound(c, "维修记录不存在")
		return
	}

	if len(repair.OldPartPhotos) == 0 {
		response.BadRequest(c, "维修完成前必须上传旧件照片，请先上传旧件照片")
		return
	}

	handlerID, _ := c.Get("user_id")
	handlerName, _ := c.Get("real_name")

	updates := make(map[string]interface{})
	updates["repair_status"] = 2
	updates["repair_end_time"] = time.Now()
	updates["handler_id"] = handlerID.(uint64)
	updates["handler_name"] = handlerName.(string)

	if repair.AppointmentStatus < 3 {
		updates["appointment_status"] = 3
		if repair.ArrivalTime.IsZero() {
			updates["arrival_time"] = time.Now()
		}
	}

	if req.RepairDescription != "" {
		updates["repair_description"] = req.RepairDescription
	}
	if req.RepairMeasure != "" {
		updates["repair_measure"] = req.RepairMeasure
	}
	if req.OldPartDisposal != "" {
		updates["old_part_disposal"] = req.OldPartDisposal
	}
	if req.PartsUsed != "" {
		updates["parts_used"] = req.PartsUsed
	}
	if req.LaborCost >= 0 {
		updates["labor_cost"] = req.LaborCost
	}
	if req.PartsCost >= 0 {
		updates["parts_cost"] = req.PartsCost
		updates["total_cost"] = req.LaborCost + req.PartsCost
	}
	if req.Remark != "" {
		updates["remark"] = req.Remark
	}

	err := models.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&repair).Updates(updates).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.VehicleVIN{}).Where("id = ?", repair.VINID).Update("status", 2).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		response.InternalServerError(c, "完成维修失败: "+err.Error())
		return
	}

	models.DB.Preload("Recall").Preload("Notification").Preload("VehicleVIN").Preload("Model").
		First(&repair, id)
	response.Success(c, repair)
}

func QualityCheck(c *gin.Context) {
	id := c.Param("id")

	type QualityCheckRequest struct {
		QualityCheckResult string `json:"quality_check_result" binding:"required"`
	}

	var req QualityCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}

	qualityCheckerID, _ := c.Get("user_id")
	qualityCheckerName, _ := c.Get("real_name")

	var repair models.RepairRecord
	if err := models.DB.Where("id = ?", id).First(&repair).Error; err != nil {
		response.NotFound(c, "维修记录不存在")
		return
	}

	if repair.RepairStatus != 2 {
		response.BadRequest(c, "只有已完成的维修才能进行质检")
		return
	}

	updates := make(map[string]interface{})
	updates["quality_check_result"] = req.QualityCheckResult
	updates["quality_checker_id"] = qualityCheckerID.(uint64)
	updates["quality_checker_name"] = qualityCheckerName.(string)
	updates["quality_check_time"] = time.Now()

	if err := models.DB.Model(&repair).Updates(updates).Error; err != nil {
		response.InternalServerError(c, "质检失败: "+err.Error())
		return
	}

	response.Success(c, repair)
}

func UpdateAppointmentStatus(c *gin.Context) {
	id := c.Param("id")

	var req AppointmentUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}

	var repair models.RepairRecord
	if err := models.DB.Where("id = ?", id).First(&repair).Error; err != nil {
		response.NotFound(c, "维修记录不存在")
		return
	}

	updates := make(map[string]interface{})
	updates["appointment_status"] = req.AppointmentStatus

	if req.AppointmentStatus >= 1 && repair.ContactTime.IsZero() {
		updates["contact_time"] = time.Now()
	}

	if req.AppointmentStatus >= 2 {
		if req.AppointmentTime != "" {
			parsed, err := time.Parse("2006-01-02 15:04:05", req.AppointmentTime)
			if err == nil {
				updates["appointment_time"] = parsed
			}
		} else if repair.AppointmentTime.IsZero() {
			updates["appointment_time"] = time.Now()
		}
	}

	if req.AppointmentStatus >= 3 && repair.ArrivalTime.IsZero() {
		updates["arrival_time"] = time.Now()
	}

	if req.ContactRemark != "" {
		updates["contact_remark"] = req.ContactRemark
	}

	if err := models.DB.Model(&repair).Updates(updates).Error; err != nil {
		response.InternalServerError(c, "更新预约状态失败: "+err.Error())
		return
	}

	models.DB.Preload("Recall").Preload("Notification").Preload("VehicleVIN").Preload("Model").
		First(&repair, id)
	response.Success(c, repair)
}

func GetRepairStatistics(c *gin.Context) {
	recallID := c.Query("recall_id")
	dealerID := c.Query("dealer_id")

	currentDealerID, _ := c.Get("dealer_id")

	newQuery := func() *gorm.DB {
		q := models.DB.Session(&gorm.Session{}).Model(&models.RepairRecord{})
		if recallID != "" {
			q = q.Where("recall_id = ?", recallID)
		}
		if dealerID != "" {
			q = q.Where("dealer_id = ?", dealerID)
		} else if did, ok := currentDealerID.(uint64); ok && did > 0 {
			q = q.Where("dealer_id = ?", did)
		}
		return q
	}

	var total int64
	newQuery().Count(&total)

	var pending int64
	newQuery().Where("repair_status = 0").Count(&pending)

	var inProgress int64
	newQuery().Where("repair_status = 1").Count(&inProgress)

	var completed int64
	newQuery().Where("repair_status = 2").Count(&completed)

	var failed int64
	newQuery().Where("repair_status = 3").Count(&failed)

	type StatusStat struct {
		Status int   `json:"status"`
		Count  int64 `json:"count"`
	}
	var repairStatusStats []StatusStat
	newQuery().Select("repair_status as status, COUNT(*) as count").
		Group("repair_status").
		Scan(&repairStatusStats)

	var appointmentStats []StatusStat
	newQuery().Select("appointment_status as status, COUNT(*) as count").
		Group("appointment_status").
		Scan(&appointmentStats)

	type DealerStat struct {
		DealerName string `json:"dealer_name"`
		Count      int64  `json:"count"`
		Completed  int64  `json:"completed"`
	}
	var dealerStats []DealerStat
	newQuery().Select("dealer_name, COUNT(*) as count, SUM(CASE WHEN repair_status = 2 THEN 1 ELSE 0 END) as completed").
		Group("dealer_name").
		Scan(&dealerStats)

	var totalCost float64
	newQuery().Select("IFNULL(SUM(total_cost), 0)").Scan(&totalCost)

	response.Success(c, gin.H{
		"total":              total,
		"pending":            pending,
		"in_progress":        inProgress,
		"completed":          completed,
		"failed":             failed,
		"total_cost":         totalCost,
		"complete_rate":      response.SafePercent(float64(completed), float64(total)),
		"by_status":          repairStatusStats,
		"by_appointment":     appointmentStats,
		"by_dealer":          dealerStats,
	})
}

func DeleteOldPartPhoto(c *gin.Context) {
	repairID := c.Param("id")
	photoURL := c.Query("url")

	var repair models.RepairRecord
	if err := models.DB.Where("id = ?", repairID).First(&repair).Error; err != nil {
		response.NotFound(c, "维修记录不存在")
		return
	}

	var newPhotos models.JSONStringArray
	for _, p := range repair.OldPartPhotos {
		if p != photoURL {
			newPhotos = append(newPhotos, p)
		} else {
			filePath := filepath.Join(".", p)
			os.Remove(filePath)
		}
	}

	if err := models.DB.Model(&repair).Update("old_part_photos", newPhotos).Error; err != nil {
		response.InternalServerError(c, "删除照片失败: "+err.Error())
		return
	}

	response.Success(c, nil)
}
