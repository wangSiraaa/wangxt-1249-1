package main

import (
	"log"
	"recall-tracking/config"
	"recall-tracking/models"
	"recall-tracking/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	if err := config.LoadConfig(); err != nil {
		log.Printf("Warning: Failed to load config: %v", err)
	}

	if err := models.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	log.Println("Database initialized successfully")

	r := gin.Default()

	routes.SetupRoutes(r)

	addr := config.AppConfig.Server.Host + ":" + config.AppConfig.Server.Port
	log.Printf("Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
