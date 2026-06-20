package controllers

import (
	"recall-tracking/models"
	"recall-tracking/pkg/response"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NotificationCreateRequest struct {
	RecallID         uint64   `json:"recall_id" binding:"required"`
	VINList          []string `json:"vin_list"`
	NotificationType string   `json:"notification_type" binding:"required"`
	ScheduledSendTime string  `json:"scheduled_send_time"`
}

type NotificationSendRequest struct {
	NotificationIDs []uint64 `json:"notification_ids" binding:"required"`
}

type NotificationConfirmRequest struct {
	OwnerConfirmStatus int    `json:"owner_confirm_status" binding:"required,oneof=1 2"`
	AppointmentTime    string `json:"appointment_time"`
	DealerID           uint64 `json:"dealer_id"`
}

func generateNotificationNo() string {
	return "NT" + time.Now().Format("20060102") + uuid.New().String()[:8]
}

func CreateNotifications(c *gin.Context) {
	var req NotificationCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}

	senderID, _ := c.Get("user_id")
	senderName, _ := c.Get("real_name")

	var recall models.RecallScope
	if err := models.DB.Where("id = ?", req.RecallID).First(&recall).Error; err != nil {
		response.NotFound(c, "召回不存在")
		return
	}

	if recall.Status != 4 {
		response.BadRequest(c, "只有已发布的召回才能生成通知")
		return
	}

	var targetVINs []models.VehicleVIN
	if len(req.VINList) > 0 {
		var inScopeVINs []string
		for _, vinStr := range req.VINList {
			var recallVIN models.RecallVIN
			result := models.DB.Where("recall_id = ? AND vin = ? AND is_in_scope = 1", req.RecallID, vinStr).First(&recallVIN)
			if result.Error != nil {
				response.BadRequest(c, "VIN "+vinStr+" 不在召回范围内，不能生成通知")
				return
			}
			inScopeVINs = append(inScopeVINs, vinStr)
		}
		models.DB.Where("vin IN ?", inScopeVINs).Find(&targetVINs)
	} else {
		var recallVINs []models.RecallVIN
		models.DB.Where("recall_id = ? AND is_in_scope = 1", req.RecallID).Find(&recallVINs)

		vinIDs := make([]uint64, len(recallVINs))
		for i, rv := range recallVINs {
			vinIDs[i] = rv.VINID
		}
		models.DB.Where("id IN ?", vinIDs).Find(&targetVINs)
	}

	var scheduledSendTime time.Time
	if req.ScheduledSendTime != "" {
		parsed, err := time.Parse("2006-01-02 15:04:05", req.ScheduledSendTime)
		if err == nil {
			scheduledSendTime = parsed
		}
	}

	notificationContent := generateNotificationContent(recall)

	var createdNotifications []models.Notification
	err := models.DB.Transaction(func(tx *gorm.DB) error {
		for _, vin := range targetVINs {
			var existingNotif models.Notification
			result := tx.Where("recall_id = ? AND vin_id = ? AND status != 3", req.RecallID, vin.ID).First(&existingNotif)
			if result.Error == nil {
				continue
			}

			notification := models.Notification{
				NotificationNo:      generateNotificationNo(),
				RecallID:            req.RecallID,
				VINID:               vin.ID,
				VIN:                 vin.VIN,
				OwnerName:           vin.OwnerName,
				OwnerPhone:          vin.OwnerPhone,
				OwnerAddress:        vin.OwnerAddress,
				NotificationType:    req.NotificationType,
				NotificationContent: notificationContent,
				ScheduledSendTime:   scheduledSendTime,
				SenderID:            senderID.(uint64),
				SenderName:          senderName.(string),
				Status:              0,
				DealerID:            vin.DealerID,
			}

			if err := tx.Create(&notification).Error; err != nil {
				return err
			}
			createdNotifications = append(createdNotifications, notification)
		}
		return nil
	})

	if err != nil {
		response.InternalServerError(c, "生成通知失败: "+err.Error())
		return
	}

	response.Success(c, gin.H{
		"created_count": len(createdNotifications),
		"notifications": createdNotifications,
	})
}

func generateNotificationContent(recall models.RecallScope) string {
	return "尊敬的车主：\n" +
		"您好！根据《缺陷汽车产品召回管理条例》，我司决定对您的车辆实施召回。\n\n" +
		"召回编号：" + recall.RecallNo + "\n" +
		"缺陷描述：" + recall.DefectDescription + "\n" +
		"风险说明：" + recall.RiskDescription + "\n" +
		"维修措施：" + recall.RepairMeasure + "\n\n" +
		"请您尽快联系就近的经销商预约维修，维修过程免费。\n" +
		"感谢您的理解与配合！"
}

func GetNotificationList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	recallID := c.Query("recall_id")
	status := c.Query("status")
	vin := c.Query("vin")
	ownerName := c.Query("owner_name")
	confirmStatus := c.Query("owner_confirm_status")

	query := models.DB.Model(&models.Notification{}).Preload("Recall").Preload("VehicleVIN")

	if recallID != "" {
		query = query.Where("recall_id = ?", recallID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if vin != "" {
		query = query.Where("vin LIKE ?", "%"+vin+"%")
	}
	if ownerName != "" {
		query = query.Where("owner_name LIKE ?", "%"+ownerName+"%")
	}
	if confirmStatus != "" {
		query = query.Where("owner_confirm_status = ?", confirmStatus)
	}

	var total int64
	query.Count(&total)

	var notifications []models.Notification
	offset := (page - 1) * pageSize
	query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&notifications)

	response.SuccessWithPage(c, notifications, total, page, pageSize)
}

func GetNotificationDetail(c *gin.Context) {
	id := c.Param("id")

	var notification models.Notification
	if err := models.DB.Preload("Recall").Preload("Recall.Model").Preload("VehicleVIN").
		Where("id = ?", id).First(&notification).Error; err != nil {
		response.NotFound(c, "通知不存在")
		return
	}

	response.Success(c, notification)
}

func SendNotifications(c *gin.Context) {
	var req NotificationSendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}

	senderID, _ := c.Get("user_id")
	senderName, _ := c.Get("real_name")

	successCount := 0
	failedCount := 0

	err := models.DB.Transaction(func(tx *gorm.DB) error {
		for _, notifID := range req.NotificationIDs {
			var notification models.Notification
			if err := tx.Where("id = ?", notifID).First(&notification).Error; err != nil {
				failedCount++
				continue
			}

			if notification.Status != 0 {
				failedCount++
				continue
			}

			updates := map[string]interface{}{
				"status":           1,
				"actual_send_time": time.Now(),
				"sender_id":        senderID.(uint64),
				"sender_name":      senderName.(string),
			}

			if err := tx.Model(&notification).Updates(updates).Error; err != nil {
				failedCount++
				continue
			}

			successCount++
		}
		return nil
	})

	if err != nil {
		response.InternalServerError(c, "发送通知失败: "+err.Error())
		return
	}

	response.Success(c, gin.H{
		"success_count": successCount,
		"failed_count":  failedCount,
		"total_count":   len(req.NotificationIDs),
	})
}

func ConfirmNotification(c *gin.Context) {
	id := c.Param("id")

	var req NotificationConfirmRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}

	var notification models.Notification
	if err := models.DB.Where("id = ?", id).First(&notification).Error; err != nil {
		response.NotFound(c, "通知不存在")
		return
	}

	if notification.Status != 1 {
		response.BadRequest(c, "只有已发送的通知才能确认")
		return
	}

	updates := make(map[string]interface{})
	updates["owner_confirm_status"] = req.OwnerConfirmStatus
	updates["owner_confirm_time"] = time.Now()

	if req.AppointmentTime != "" {
		parsed, err := time.Parse("2006-01-02 15:04:05", req.AppointmentTime)
		if err == nil {
			updates["appointment_time"] = parsed
		}
	}
	if req.DealerID > 0 {
		updates["dealer_id"] = req.DealerID
	}

	if err := models.DB.Model(&notification).Updates(updates).Error; err != nil {
		response.InternalServerError(c, "确认通知失败: "+err.Error())
		return
	}

	response.Success(c, notification)
}

func GetNotificationStatistics(c *gin.Context) {
	recallID := c.Query("recall_id")

	query := models.DB.Model(&models.Notification{})
	if recallID != "" {
		query = query.Where("recall_id = ?", recallID)
	}

	var total int64
	query.Count(&total)

	var pending int64
	query.Where("status = 0").Count(&pending)

	var sent int64
	query.Where("status = 1").Count(&sent)

	var confirmed int64
	query.Where("owner_confirm_status = 1").Count(&confirmed)

	var rejected int64
	query.Where("owner_confirm_status = 2").Count(&rejected)

	response.Success(c, gin.H{
		"total":       total,
		"pending":     pending,
		"sent":        sent,
		"confirmed":   confirmed,
		"rejected":    rejected,
		"send_rate":   float64(sent) / float64(total) * 100,
		"confirm_rate": float64(confirmed) / float64(sent) * 100,
	})
}
