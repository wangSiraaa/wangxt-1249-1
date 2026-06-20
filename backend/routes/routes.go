package routes

import (
	"net/http"
	"recall-tracking/config"
	"recall-tracking/controllers"
	"recall-tracking/pkg/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	r.Use(middleware.CORSMiddleware())

	r.StaticFS("/uploads", http.Dir(config.AppConfig.Upload.Path))

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/login", controllers.Login)
			auth.POST("/logout", middleware.AuthMiddleware(), controllers.Logout)
			auth.GET("/user", middleware.AuthMiddleware(), controllers.GetCurrentUser)
		}

		common := api.Group("/common")
		common.Use(middleware.AuthMiddleware())
		{
			common.GET("/dashboard", controllers.GetDashboardStats)
			common.GET("/models", controllers.GetModelList)
			common.GET("/vins", controllers.GetVINList)
			common.GET("/vins/:id", controllers.GetVINDetail)
			common.GET("/dealers", controllers.GetDealerList)
			common.GET("/users", controllers.GetUserList)
			common.GET("/brands", controllers.GetBrandList)
			common.GET("/cities", controllers.GetCityList)
		}

		complaints := api.Group("/complaints")
		complaints.Use(middleware.AuthMiddleware())
		{
			complaints.POST("", middleware.RoleMiddleware("QUALITY_ENGINEER", "ADMIN"), controllers.CreateComplaint)
			complaints.GET("", controllers.GetComplaintList)
			complaints.GET("/statistics", controllers.GetDefectStatistics)
			complaints.GET("/:id", controllers.GetComplaintDetail)
			complaints.PUT("/:id", middleware.RoleMiddleware("QUALITY_ENGINEER", "ADMIN"), controllers.UpdateComplaint)
			complaints.DELETE("/:id", middleware.RoleMiddleware("QUALITY_ENGINEER", "ADMIN"), controllers.DeleteComplaint)
		}

		recalls := api.Group("/recalls")
		recalls.Use(middleware.AuthMiddleware())
		{
			recalls.POST("", middleware.RoleMiddleware("REGULATION_OFFICER", "ADMIN"), controllers.CreateRecall)
			recalls.GET("", controllers.GetRecallList)
			recalls.GET("/:id", controllers.GetRecallDetail)
			recalls.GET("/:id/vins", controllers.GetRecallAffectedVINs)
			recalls.PUT("/:id", middleware.RoleMiddleware("REGULATION_OFFICER", "ADMIN"), controllers.UpdateRecall)
			recalls.POST("/:id/confirm", middleware.RoleMiddleware("REGULATION_OFFICER", "ADMIN"), controllers.ConfirmRecall)
			recalls.POST("/:id/publish", middleware.RoleMiddleware("REGULATION_OFFICER", "ADMIN"), controllers.PublishRecall)
		}

		notifications := api.Group("/notifications")
		notifications.Use(middleware.AuthMiddleware())
		{
			notifications.POST("", middleware.RoleMiddleware("REGULATION_OFFICER", "ADMIN"), controllers.CreateNotifications)
			notifications.GET("", controllers.GetNotificationList)
			notifications.GET("/statistics", controllers.GetNotificationStatistics)
			notifications.GET("/:id", controllers.GetNotificationDetail)
			notifications.POST("/send", middleware.RoleMiddleware("REGULATION_OFFICER", "ADMIN"), controllers.SendNotifications)
			notifications.POST("/:id/confirm", controllers.ConfirmNotification)
		}

		repairs := api.Group("/repairs")
		repairs.Use(middleware.AuthMiddleware())
		{
			repairs.POST("", middleware.RoleMiddleware("DEALER", "ADMIN"), controllers.CreateRepair)
			repairs.GET("", controllers.GetRepairList)
			repairs.GET("/statistics", controllers.GetRepairStatistics)
			repairs.GET("/:id", controllers.GetRepairDetail)
			repairs.PUT("/:id", middleware.RoleMiddleware("DEALER", "ADMIN"), controllers.UpdateRepair)
			repairs.POST("/:id/complete", middleware.RoleMiddleware("DEALER", "ADMIN"), controllers.CompleteRepair)
			repairs.POST("/:id/quality-check", middleware.RoleMiddleware("QUALITY_ENGINEER", "ADMIN"), controllers.QualityCheck)
			repairs.POST("/:id/photos", middleware.RoleMiddleware("DEALER", "ADMIN"), controllers.UploadOldPartPhoto)
			repairs.DELETE("/:id/photos", middleware.RoleMiddleware("DEALER", "ADMIN"), controllers.DeleteOldPartPhoto)
		}
	}
}
