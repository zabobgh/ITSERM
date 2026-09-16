package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"nbk-occ-system/backend/database"
	"nbk-occ-system/backend/models"

	"github.com/gin-gonic/gin"
)

// GetFollowUps retrieves all follow-up records, optionally filtered by citizen_id
func GetFollowUps(c *gin.Context) {
	citizenID := c.Query("citizen_id")

	var rows *sql.Rows
	var err error

	if citizenID != "" {
		query := `SELECT id, citizen_id, COALESCE(assessment_id, ''), follow_up_date, responsible_person, follow_up_type, result, COALESCE(notes, ''), created_at 
		          FROM followups WHERE citizen_id = ? ORDER BY follow_up_date DESC, created_at DESC`
		rows, err = database.DB.Query(query, citizenID)
	} else {
		query := `SELECT id, citizen_id, COALESCE(assessment_id, ''), follow_up_date, responsible_person, follow_up_type, result, COALESCE(notes, ''), created_at 
		          FROM followups ORDER BY follow_up_date DESC, created_at DESC`
		rows, err = database.DB.Query(query)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch follow-ups: " + err.Error()})
		return
	}
	defer rows.Close()

	list := make([]models.FollowUpRecord, 0)
	for rows.Next() {
		var f models.FollowUpRecord
		if err := rows.Scan(&f.ID, &f.CitizenID, &f.AssessmentID, &f.FollowUpDate, &f.ResponsiblePerson, &f.FollowUpType, &f.Result, &f.Notes, &f.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read follow-up row: " + err.Error()})
			return
		}
		list = append(list, f)
	}

	c.JSON(http.StatusOK, list)
}

// CreateFollowUp adds a new follow-up record
func CreateFollowUp(c *gin.Context) {
	var input models.FollowUpRecord
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid follow-up payload: " + err.Error()})
		return
	}

	if input.ID == "" {
		input.ID = fmt.Sprintf("FU-%d", time.Now().UnixNano())
	}
	now := time.Now().Format("2006-01-02 15:04:05")
	input.CreatedAt = now

	query := `INSERT INTO followups (id, citizen_id, assessment_id, follow_up_date, responsible_person, follow_up_type, result, notes, created_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := database.DB.Exec(query, input.ID, input.CitizenID, input.AssessmentID, input.FollowUpDate, input.ResponsiblePerson, input.FollowUpType, input.Result, input.Notes, input.CreatedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save follow-up: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, input)
}

// DeleteFollowUp deletes a follow-up entry by ID
func DeleteFollowUp(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Follow-up ID is required"})
		return
	}

	res, err := database.DB.Exec("DELETE FROM followups WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete follow-up: " + err.Error()})
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Follow-up record not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Follow-up record deleted successfully"})
}
