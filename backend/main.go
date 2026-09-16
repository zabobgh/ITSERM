package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"nbk-occ-system/backend/database"
	"nbk-occ-system/backend/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize Database with WAL mode
	dbFile := "nbk_records.db"
	if envDB := os.Getenv("DB_PATH"); envDB != "" {
		dbFile = envDB
	}

	_, err := database.InitDB(dbFile)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	r := gin.Default()

	// CORS Middleware for development
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	r.Use(cors.New(corsConfig))

	// API Route Group
	api := r.Group("/api")
	{
		// Farmer endpoints
		api.GET("/farmers/:citizen_id", handlers.GetFarmerByCitizenID)

		// Assessment endpoints
		api.POST("/assessments", handlers.CreateAssessment)
		api.GET("/assessments", handlers.GetAssessments)
		api.GET("/assessments/:id", handlers.GetAssessmentByID)
		api.PUT("/assessments/:id", handlers.UpdateAssessment)
		api.DELETE("/assessments/:id", handlers.DeleteAssessment)

		// Analytics & Government Reports
		api.GET("/stats/dashboard", handlers.GetDashboardStats)
		api.GET("/reports/occ01", handlers.GetReportOCC01)
		api.GET("/reports/occ02", handlers.GetReportOCC02)
	}

	// Static frontend serving if built (for Standalone Single Executable deployment)
	distCandidates := []string{
		filepath.Join("..", "frontend", "dist"),
		filepath.Join(".", "frontend", "dist"),
		filepath.Join("dist"),
	}
	var distPath string
	for _, cand := range distCandidates {
		if info, err := os.Stat(cand); err == nil && info.IsDir() {
			distPath = cand
			break
		}
	}

	if distPath != "" {
		log.Printf("Serving static frontend files from: %s", distPath)
		r.Static("/assets", filepath.Join(distPath, "assets"))
		r.StaticFile("/favicon.ico", filepath.Join(distPath, "favicon.ico"))
		r.NoRoute(func(c *gin.Context) {
			if strings.HasPrefix(c.Request.URL.Path, "/api/") {
				c.JSON(http.StatusNotFound, gin.H{"error": "API endpoint not available"})
				return
			}
			c.File(filepath.Join(distPath, "index.html"))
		})
	} else {
		r.GET("/", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"system":  "ระบบคัดกรองสุขภาพเกษตรกร นบก. 1-56 & รายงาน OCC",
				"status":  "online",
				"api_doc": "/api/stats/dashboard, /api/assessments, /api/reports/occ01, /api/reports/occ02",
			})
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on http://localhost:%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
