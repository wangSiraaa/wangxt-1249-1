package models

import (
	"fmt"
	"log"
	"recall-tracking/config"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() error {
	dsnWithoutDB := config.GetDSNWithoutDB()
	tmpDB, err := gorm.Open(mysql.Open(dsnWithoutDB), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return fmt.Errorf("failed to connect mysql server: %w", err)
	}
	createSQL := "CREATE DATABASE IF NOT EXISTS `" + config.AppConfig.DB.Name + "` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
	if err := tmpDB.Exec(createSQL).Error; err != nil {
		return fmt.Errorf("failed to create database: %w", err)
	}
	sqlTmpDB, _ := tmpDB.DB()
	sqlTmpDB.Close()

	dsn := config.GetDSN()
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect database: %w", err)
	}

	DB = db

	if err := db.AutoMigrate(
		&VehicleModel{},
		&VehicleVIN{},
		&Complaint{},
		&RecallScope{},
		&RecallVIN{},
		&Notification{},
		&RepairRecord{},
		&Dealer{},
		&User{},
	); err != nil {
		return fmt.Errorf("failed to auto migrate: %w", err)
	}

	if err := seedData(db); err != nil {
		return fmt.Errorf("failed to seed data: %w", err)
	}

	return nil
}

func GetDB() *gorm.DB {
	return DB
}

func seedData(db *gorm.DB) error {
	var userCount int64
	db.Model(&User{}).Count(&userCount)
	if userCount > 0 {
		return nil
	}

	log.Println("Seeding initial data...")

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	passwordHash := string(hashedPassword)

	dealers := []Dealer{
		{DealerCode: "D001", DealerName: "北京奔驰4S店", ContactPerson: "张三", ContactPhone: "13800138001", Address: "北京市朝阳区建国路88号", City: "北京", Status: 1},
		{DealerCode: "D002", DealerName: "上海大众4S店", ContactPerson: "李四", ContactPhone: "13800138002", Address: "上海市浦东新区张江路100号", City: "上海", Status: 1},
		{DealerCode: "D003", DealerName: "广州丰田4S店", ContactPerson: "王五", ContactPhone: "13800138003", Address: "广州市天河区天河路200号", City: "广州", Status: 1},
	}
	if err := db.Create(&dealers).Error; err != nil {
		return err
	}

	users := []User{
		{Username: "admin", Password: passwordHash, RealName: "系统管理员", Role: "ADMIN", Phone: "13900139000", Email: "admin@example.com", Status: 1},
		{Username: "engineer1", Password: passwordHash, RealName: "李工", Role: "QUALITY_ENGINEER", Phone: "13900139001", Email: "engineer1@example.com", Status: 1},
		{Username: "engineer2", Password: passwordHash, RealName: "王工", Role: "QUALITY_ENGINEER", Phone: "13900139002", Email: "engineer2@example.com", Status: 1},
		{Username: "officer1", Password: passwordHash, RealName: "张专员", Role: "REGULATION_OFFICER", Phone: "13900139003", Email: "officer1@example.com", Status: 1},
		{Username: "dealer1", Password: passwordHash, RealName: "北京店管理员", Role: "DEALER", DealerID: 1, Phone: "13900139004", Email: "dealer1@example.com", Status: 1},
		{Username: "dealer2", Password: passwordHash, RealName: "上海店管理员", Role: "DEALER", DealerID: 2, Phone: "13900139005", Email: "dealer2@example.com", Status: 1},
	}
	if err := db.Create(&users).Error; err != nil {
		return err
	}

	prodStart1, _ := time.Parse("2006-01-02", "2022-09-01")
	prodEnd1, _ := time.Parse("2006-01-02", "2023-12-31")
	prodStart2, _ := time.Parse("2006-01-02", "2022-06-01")
	prodEnd2, _ := time.Parse("2006-01-02", "2023-12-31")
	prodStart3, _ := time.Parse("2006-01-02", "2021-09-01")
	prodEnd3, _ := time.Parse("2006-01-02", "2022-12-31")
	prodStart4, _ := time.Parse("2006-01-02", "2022-03-01")
	prodEnd4, _ := time.Parse("2006-01-02", "2023-12-31")

	vehicleModels := []VehicleModel{
		{Brand: "奔驰", Model: "C级", Year: 2023, EngineType: "1.5T", ProductionStartDate: prodStart1, ProductionEndDate: prodEnd1, Description: "奔驰C级轿车，配备1.5T涡轮增压发动机"},
		{Brand: "奔驰", Model: "E级", Year: 2023, EngineType: "2.0T", ProductionStartDate: prodStart2, ProductionEndDate: prodEnd2, Description: "奔驰E级轿车，配备2.0T涡轮增压发动机"},
		{Brand: "大众", Model: "帕萨特", Year: 2022, EngineType: "2.0T", ProductionStartDate: prodStart3, ProductionEndDate: prodEnd3, Description: "大众帕萨特轿车，配备2.0T涡轮增压发动机"},
		{Brand: "丰田", Model: "凯美瑞", Year: 2023, EngineType: "2.5L", ProductionStartDate: prodStart4, ProductionEndDate: prodEnd4, Description: "丰田凯美瑞轿车，配备2.5L自然吸气发动机"},
	}
	if err := db.Create(&vehicleModels).Error; err != nil {
		return err
	}

	prodDates := []string{
		"2022-10-15", "2022-11-20", "2022-12-05", "2023-01-10", "2023-02-15", "2023-03-20",
	}
	ownerNames := []string{"刘先生", "陈女士", "赵先生", "孙女士", "周先生", "吴女士"}
	ownerPhones := []string{"13700137001", "13700137002", "13700137003", "13700137004", "13700137005", "13700137006"}
	ownerAddrs := []string{
		"北京市海淀区中关村大街1号", "北京市西城区金融街10号", "北京市朝阳区望京SOHO",
		"北京市东城区王府井大街", "北京市丰台区北京西站", "北京市石景山万达广场",
	}

	var vehicleVINs []VehicleVIN
	for i := 0; i < 6; i++ {
		prodDate, _ := time.Parse("2006-01-02", prodDates[i])
		vinStr := fmt.Sprintf("WDDWF4KBXJR30000%d", i+1)
		vehicleVINs = append(vehicleVINs, VehicleVIN{
			VIN:            vinStr,
			ModelID:        1,
			ProductionDate: prodDate,
			OwnerName:      ownerNames[i],
			OwnerPhone:     ownerPhones[i],
			OwnerAddress:   ownerAddrs[i],
			DealerID:       1,
			Status:         0,
		})
	}

	prodDate21, _ := time.Parse("2006-01-02", "2022-08-10")
	prodDate22, _ := time.Parse("2006-01-02", "2022-09-15")
	vehicleVINs = append(vehicleVINs, VehicleVIN{
		VIN: "WDDZF4JBXKA100001", ModelID: 2, ProductionDate: prodDate21,
		OwnerName: "郑先生", OwnerPhone: "13700137007", OwnerAddress: "上海市浦东新区陆家嘴", DealerID: 2, Status: 0,
	})
	vehicleVINs = append(vehicleVINs, VehicleVIN{
		VIN: "WDDZF4JBXKA100002", ModelID: 2, ProductionDate: prodDate22,
		OwnerName: "冯女士", OwnerPhone: "13700137008", OwnerAddress: "上海市徐汇区徐家汇", DealerID: 2, Status: 0,
	})

	prodDate31, _ := time.Parse("2006-01-02", "2021-11-20")
	prodDate32, _ := time.Parse("2006-01-02", "2021-12-25")
	vehicleVINs = append(vehicleVINs, VehicleVIN{
		VIN: "WVWZZZ3CZME100001", ModelID: 3, ProductionDate: prodDate31,
		OwnerName: "蒋先生", OwnerPhone: "13700137009", OwnerAddress: "广州市天河区珠江新城", DealerID: 3, Status: 0,
	})
	vehicleVINs = append(vehicleVINs, VehicleVIN{
		VIN: "WVWZZZ3CZME100002", ModelID: 3, ProductionDate: prodDate32,
		OwnerName: "沈女士", OwnerPhone: "13700137010", OwnerAddress: "广州市越秀区北京路", DealerID: 3, Status: 0,
	})

	if err := db.Create(&vehicleVINs).Error; err != nil {
		return err
	}

	log.Println("Initial data seeded successfully (users password: 123456)")
	return nil
}
