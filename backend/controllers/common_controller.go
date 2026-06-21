package controllers

import (
	"recall-tracking/models"
	"recall-tracking/pkg/response"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetModelList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	brand := c.Query("brand")
	keyword := c.Query("keyword")

	query := models.DB.Model(&models.VehicleModel{})

	if brand != "" {
		query = query.Where("brand = ?", brand)
	}
	if keyword != "" {
		query = query.Where("brand LIKE ? OR model LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	var total int64
	query.Count(&total)

	var models_ []models.VehicleModel
	offset := (page - 1) * pageSize
	query.Order("brand, model, year DESC").Offset(offset).Limit(pageSize).Find(&models_)

	response.SuccessWithPage(c, models_, total, page, pageSize)
}

func GetVINList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	modelID := c.Query("model_id")
	vin := c.Query("vin")
	ownerName := c.Query("owner_name")
	status := c.Query("status")

	query := models.DB.Model(&models.VehicleVIN{}).Preload("Model")

	if modelID != "" {
		query = query.Where("model_id = ?", modelID)
	}
	if vin != "" {
		query = query.Where("vin LIKE ?", "%"+vin+"%")
	}
	if ownerName != "" {
		query = query.Where("owner_name LIKE ?", "%"+ownerName+"%")
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var vins []models.VehicleVIN
	offset := (page - 1) * pageSize
	query.Order("vin ASC").Offset(offset).Limit(pageSize).Find(&vins)

	response.SuccessWithPage(c, vins, total, page, pageSize)
}

func GetVINDetail(c *gin.Context) {
	id := c.Param("id")

	var vin models.VehicleVIN
	if err := models.DB.Preload("Model").Where("id = ?", id).First(&vin).Error; err != nil {
		response.NotFound(c, "VIN不存在")
		return
	}

	var notifications []models.Notification
	models.DB.Where("vin_id = ?", id).Order("created_at DESC").Find(&notifications)

	var repairs []models.RepairRecord
	models.DB.Where("vin_id = ?", id).Order("created_at DESC").Find(&repairs)

	response.Success(c, gin.H{
		"vin":           vin,
		"notifications": notifications,
		"repairs":       repairs,
	})
}

func GetDealerList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	city := c.Query("city")
	status := c.Query("status")
	keyword := c.Query("keyword")

	query := models.DB.Model(&models.Dealer{})

	if city != "" {
		query = query.Where("city = ?", city)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if keyword != "" {
		query = query.Where("dealer_name LIKE ? OR dealer_code LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	var total int64
	query.Count(&total)

	var dealers []models.Dealer
	offset := (page - 1) * pageSize
	query.Order("dealer_code ASC").Offset(offset).Limit(pageSize).Find(&dealers)

	response.SuccessWithPage(c, dealers, total, page, pageSize)
}

func GetUserList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	role := c.Query("role")
	status := c.Query("status")
	keyword := c.Query("keyword")

	query := models.DB.Model(&models.User{})

	if role != "" {
		query = query.Where("role = ?", role)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if keyword != "" {
		query = query.Where("username LIKE ? OR real_name LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	var total int64
	query.Count(&total)

	var users []models.User
	offset := (page - 1) * pageSize
	query.Order("username ASC").Offset(offset).Limit(pageSize).Find(&users)

	response.SuccessWithPage(c, users, total, page, pageSize)
}

func GetBrandList(c *gin.Context) {
	var brands []string
	models.DB.Model(&models.VehicleModel{}).Distinct("brand").Pluck("brand", &brands)
	response.Success(c, brands)
}

func GetCityList(c *gin.Context) {
	var cities []string
	models.DB.Model(&models.Dealer{}).Distinct("city").Pluck("city", &cities)
	response.Success(c, cities)
}

func GetDashboardStats(c *gin.Context) {
	var complaintCount int64
	models.DB.Model(&models.Complaint{}).Count(&complaintCount)

	var defectCount int64
	models.DB.Model(&models.Complaint{}).Where("is_defect = 1").Count(&defectCount)

	var recallCount int64
	models.DB.Model(&models.RecallScope{}).Count(&recallCount)

	var publishedRecallCount int64
	models.DB.Model(&models.RecallScope{}).Where("status = 4").Count(&publishedRecallCount)

	var notificationCount int64
	models.DB.Model(&models.Notification{}).Count(&notificationCount)

	var sentNotificationCount int64
	models.DB.Model(&models.Notification{}).Where("status = 1").Count(&sentNotificationCount)

	var repairCount int64
	models.DB.Model(&models.RepairRecord{}).Count(&repairCount)

	var completedRepairCount int64
	models.DB.Model(&models.RepairRecord{}).Where("repair_status = 2").Count(&completedRepairCount)

	var totalRepairCost float64
	models.DB.Table("repair_records").Select("IFNULL(SUM(total_cost), 0)").Scan(&totalRepairCost)

	type RecentRecall struct {
		RecallNo          string `json:"recall_no"`
		DefectDescription string `json:"defect_description"`
		Status            int    `json:"status"`
		CreatedAt         string `json:"created_at"`
	}
	var recentRecalls []RecentRecall
	models.DB.Table("recall_scopes").
		Select("recall_no, defect_description, status, created_at").
		Order("created_at DESC").
		Limit(5).
		Scan(&recentRecalls)

	type RecentRepair struct {
		RepairNo     string `json:"repair_no"`
		VIN          string `json:"vin"`
		RepairStatus int    `json:"repair_status"`
		HandlerName  string `json:"handler_name"`
		CreatedAt    string `json:"created_at"`
	}
	var recentRepairs []RecentRepair
	models.DB.Table("repair_records").
		Select("repair_no, vin, repair_status, handler_name, created_at").
		Order("created_at DESC").
		Limit(5).
		Scan(&recentRepairs)

	response.Success(c, gin.H{
		"complaint_count":          complaintCount,
		"defect_count":             defectCount,
		"recall_count":             recallCount,
		"published_recall_count":   publishedRecallCount,
		"notification_count":       notificationCount,
		"sent_notification_count":  sentNotificationCount,
		"repair_count":             repairCount,
		"completed_repair_count":   completedRepairCount,
		"total_repair_cost":        totalRepairCost,
		"recent_recalls":           recentRecalls,
		"recent_repairs":           recentRepairs,
		"defect_rate":              response.SafePercent(float64(defectCount), float64(complaintCount)),
		"notification_send_rate":   response.SafePercent(float64(sentNotificationCount), float64(notificationCount)),
		"repair_complete_rate":     response.SafePercent(float64(completedRepairCount), float64(repairCount)),
	})
}
