package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

type JSONStringArray []string

func (j JSONStringArray) Value() (driver.Value, error) {
	return json.Marshal(j)
}

func (j *JSONStringArray) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to unmarshal JSON value")
	}
	return json.Unmarshal(bytes, j)
}

type BaseModel struct {
	ID        uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type VehicleModel struct {
	BaseModel
	Brand              string    `gorm:"type:varchar(100);not null" json:"brand"`
	Model              string    `gorm:"type:varchar(100);not null" json:"model"`
	Year               int       `gorm:"not null" json:"year"`
	EngineType         string    `gorm:"type:varchar(50)" json:"engine_type"`
	ProductionStartDate time.Time `json:"production_start_date"`
	ProductionEndDate   time.Time `json:"production_end_date"`
	Description        string    `gorm:"type:text" json:"description"`
}

func (VehicleModel) TableName() string {
	return "vehicle_models"
}

type VehicleVIN struct {
	BaseModel
	VIN            string    `gorm:"type:varchar(17);not null;uniqueIndex" json:"vin"`
	ModelID        uint64    `gorm:"not null" json:"model_id"`
	ProductionDate time.Time `json:"production_date"`
	OwnerName      string    `gorm:"type:varchar(100)" json:"owner_name"`
	OwnerPhone     string    `gorm:"type:varchar(20)" json:"owner_phone"`
	OwnerAddress   string    `gorm:"type:varchar(500)" json:"owner_address"`
	DealerID       uint64    `json:"dealer_id"`
	Status         int       `gorm:"default:0" json:"status"`
	Model          VehicleModel `gorm:"foreignKey:ModelID" json:"model,omitempty"`
}

func (VehicleVIN) TableName() string {
	return "vehicle_vins"
}

type Complaint struct {
	BaseModel
	ComplaintNo       string    `gorm:"type:varchar(50);not null;uniqueIndex" json:"complaint_no"`
	ModelID           uint64    `gorm:"not null" json:"model_id"`
	VIN               string    `gorm:"type:varchar(17)" json:"vin"`
	ComplaintType     string    `gorm:"type:varchar(100);not null" json:"complaint_type"`
	FaultDescription  string    `gorm:"type:text;not null" json:"fault_description"`
	FaultLocation     string    `gorm:"type:varchar(200)" json:"fault_location"`
	OccurrenceTime    time.Time `json:"occurrence_time"`
	Mileage           int       `json:"mileage"`
	ReporterName      string    `gorm:"type:varchar(100)" json:"reporter_name"`
	ReporterType      string    `gorm:"type:varchar(50)" json:"reporter_type"`
	QualityEngineerID uint64    `json:"quality_engineer_id"`
	QualityEngineerName string   `gorm:"type:varchar(100)" json:"quality_engineer_name"`
	SampleType        string    `gorm:"type:varchar(50)" json:"sample_type"`
	Status            int       `gorm:"default:0" json:"status"`
	AnalysisResult    string    `gorm:"type:text" json:"analysis_result"`
	IsDefect          int       `gorm:"default:0" json:"is_defect"`
	RelatedRecallID   uint64    `json:"related_recall_id"`
	Model             VehicleModel `gorm:"foreignKey:ModelID" json:"model,omitempty"`
}

func (Complaint) TableName() string {
	return "complaints"
}

type RecallScope struct {
	BaseModel
	RecallNo            string    `gorm:"type:varchar(50);not null;uniqueIndex" json:"recall_no"`
	ModelID             uint64    `gorm:"not null" json:"model_id"`
	DefectDescription   string    `gorm:"type:text;not null" json:"defect_description"`
	DefectCause         string    `gorm:"type:text" json:"defect_cause"`
	RiskDescription     string    `gorm:"type:text" json:"risk_description"`
	VINStart            string    `gorm:"type:varchar(17)" json:"vin_start"`
	VINEnd              string    `gorm:"type:varchar(17)" json:"vin_end"`
	ProductionStartDate time.Time `json:"production_start_date"`
	ProductionEndDate   time.Time `json:"production_end_date"`
	VINCount            int       `gorm:"default:0" json:"vin_count"`
	ComplaintCount      int       `gorm:"default:0" json:"complaint_count"`
	MinComplaintThreshold int    `gorm:"default:5" json:"min_complaint_threshold"`
	RegulationOfficerID   uint64  `json:"regulation_officer_id"`
	RegulationOfficerName string  `gorm:"type:varchar(100)" json:"regulation_officer_name"`
	RepairMeasure       string    `gorm:"type:text" json:"repair_measure"`
	EstimatedCost       float64   `gorm:"type:decimal(15,2)" json:"estimated_cost"`
	Status              int       `gorm:"default:0" json:"status"`
	ConfirmedAt         time.Time `json:"confirmed_at"`
	PublishedAt         time.Time `json:"published_at"`
	Model               VehicleModel `gorm:"foreignKey:ModelID" json:"model,omitempty"`
	RecallVINs          []RecallVIN `gorm:"foreignKey:RecallID" json:"recall_vins,omitempty"`
}

func (RecallScope) TableName() string {
	return "recall_scopes"
}

type RecallVIN struct {
	BaseModel
	RecallID  uint64 `gorm:"not null;uniqueIndex:uk_recall_vin" json:"recall_id"`
	VINID     uint64 `gorm:"not null;uniqueIndex:uk_recall_vin" json:"vin_id"`
	VIN       string `gorm:"type:varchar(17);not null;index" json:"vin"`
	IsInScope int    `gorm:"default:1" json:"is_in_scope"`
}

func (RecallVIN) TableName() string {
	return "recall_vins"
}

type Notification struct {
	BaseModel
	NotificationNo     string    `gorm:"type:varchar(50);not null;uniqueIndex" json:"notification_no"`
	RecallID           uint64    `gorm:"not null" json:"recall_id"`
	VINID              uint64    `gorm:"not null" json:"vin_id"`
	VIN                string    `gorm:"type:varchar(17);not null;index" json:"vin"`
	OwnerName          string    `gorm:"type:varchar(100)" json:"owner_name"`
	OwnerPhone         string    `gorm:"type:varchar(20)" json:"owner_phone"`
	OwnerAddress       string    `gorm:"type:varchar(500)" json:"owner_address"`
	NotificationType   string    `gorm:"type:varchar(50);default:'MAIL'" json:"notification_type"`
	NotificationContent string    `gorm:"type:text" json:"notification_content"`
	ScheduledSendTime  time.Time `json:"scheduled_send_time"`
	ActualSendTime     time.Time `json:"actual_send_time"`
	SenderID           uint64    `json:"sender_id"`
	SenderName         string    `gorm:"type:varchar(100)" json:"sender_name"`
	Status             int       `gorm:"default:0" json:"status"`
	OwnerConfirmStatus int       `gorm:"default:0" json:"owner_confirm_status"`
	OwnerConfirmTime   time.Time `json:"owner_confirm_time"`
	AppointmentTime    time.Time `json:"appointment_time"`
	DealerID           uint64    `json:"dealer_id"`
	FailureReason      string    `gorm:"type:text" json:"failure_reason"`
	Recall             RecallScope `gorm:"foreignKey:RecallID" json:"recall,omitempty"`
	VehicleVIN         VehicleVIN  `gorm:"foreignKey:VINID" json:"vehicle_vin,omitempty"`
}

func (Notification) TableName() string {
	return "notifications"
}

type RepairRecord struct {
	BaseModel
	RepairNo          string         `gorm:"type:varchar(50);not null;uniqueIndex" json:"repair_no"`
	RecallID          uint64         `gorm:"not null" json:"recall_id"`
	NotificationID    uint64         `json:"notification_id"`
	VINID             uint64         `gorm:"not null" json:"vin_id"`
	VIN               string         `gorm:"type:varchar(17);not null;index" json:"vin"`
	ModelID           uint64         `gorm:"not null" json:"model_id"`
	DealerID          uint64         `json:"dealer_id"`
	DealerName        string         `gorm:"type:varchar(200)" json:"dealer_name"`
	RepairType        string         `gorm:"type:varchar(100)" json:"repair_type"`
	RepairDescription string         `gorm:"type:text" json:"repair_description"`
	RepairMeasure     string         `gorm:"type:text" json:"repair_measure"`
	OldPartPhotos     JSONStringArray `gorm:"type:json" json:"old_part_photos"`
	OldPartDisposal   string         `gorm:"type:varchar(200)" json:"old_part_disposal"`
	RepairStartTime   time.Time      `json:"repair_start_time"`
	RepairEndTime     time.Time      `json:"repair_end_time"`
	RepairStatus      int            `gorm:"default:0" json:"repair_status"`
	HandlerID         uint64         `gorm:"not null" json:"handler_id"`
	HandlerName       string         `gorm:"type:varchar(100);not null" json:"handler_name"`
	PartsUsed         string         `gorm:"type:text" json:"parts_used"`
	LaborCost         float64        `gorm:"type:decimal(15,2);default:0" json:"labor_cost"`
	PartsCost         float64        `gorm:"type:decimal(15,2);default:0" json:"parts_cost"`
	TotalCost         float64        `gorm:"type:decimal(15,2);default:0" json:"total_cost"`
	OwnerSignature    string         `gorm:"type:varchar(200)" json:"owner_signature"`
	QualityCheckResult string        `gorm:"type:text" json:"quality_check_result"`
	QualityCheckerID  uint64         `json:"quality_checker_id"`
	QualityCheckerName string        `gorm:"type:varchar(100)" json:"quality_checker_name"`
	QualityCheckTime  time.Time      `json:"quality_check_time"`
	Remark            string         `gorm:"type:text" json:"remark"`
	Recall            RecallScope    `gorm:"foreignKey:RecallID" json:"recall,omitempty"`
	Notification      Notification   `gorm:"foreignKey:NotificationID" json:"notification,omitempty"`
	VehicleVIN        VehicleVIN     `gorm:"foreignKey:VINID" json:"vehicle_vin,omitempty"`
	Model             VehicleModel   `gorm:"foreignKey:ModelID" json:"model,omitempty"`
}

func (RepairRecord) TableName() string {
	return "repair_records"
}

type Dealer struct {
	BaseModel
	DealerCode   string `gorm:"type:varchar(50);not null;uniqueIndex" json:"dealer_code"`
	DealerName   string `gorm:"type:varchar(200);not null" json:"dealer_name"`
	ContactPerson string `gorm:"type:varchar(100)" json:"contact_person"`
	ContactPhone string `gorm:"type:varchar(20)" json:"contact_phone"`
	Address      string `gorm:"type:varchar(500)" json:"address"`
	City         string `gorm:"type:varchar(100)" json:"city"`
	Status       int    `gorm:"default:1" json:"status"`
}

func (Dealer) TableName() string {
	return "dealers"
}

type User struct {
	BaseModel
	Username string `gorm:"type:varchar(50);not null;uniqueIndex" json:"username"`
	Password string `gorm:"type:varchar(255);not null" json:"-"`
	RealName string `gorm:"type:varchar(100);not null" json:"real_name"`
	Role     string `gorm:"type:varchar(50);not null" json:"role"`
	DealerID uint64 `json:"dealer_id"`
	Phone    string `gorm:"type:varchar(20)" json:"phone"`
	Email    string `gorm:"type:varchar(100)" json:"email"`
	Status   int    `gorm:"default:1" json:"status"`
}

func (User) TableName() string {
	return "users"
}
