package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DB       DBConfig
	Server   ServerConfig
	JWT      JWTConfig
	Upload   UploadConfig
}

type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

type ServerConfig struct {
	Host string
	Port string
}

type JWTConfig struct {
	Secret      string
	ExpireHours int
}

type UploadConfig struct {
	Path         string
	MaxSizeBytes int64
}

var AppConfig *Config

func LoadConfig() error {
	_ = godotenv.Load()

	expireHours, _ := strconv.Atoi(getEnv("JWT_EXPIRE_HOURS", "24"))
	maxSize, _ := strconv.ParseInt(getEnv("MAX_UPLOAD_SIZE", "10485760"), 10, 64)

	AppConfig = &Config{
		DB: DBConfig{
			Host:     getEnv("DB_HOST", "127.0.0.1"),
			Port:     getEnv("DB_PORT", "3306"),
			User:     getEnv("DB_USER", "root"),
			Password: getEnv("DB_PASSWORD", "password"),
			Name:     getEnv("DB_NAME", "recall_tracking"),
		},
		Server: ServerConfig{
			Host: getEnv("SERVER_HOST", "0.0.0.0"),
			Port: getEnv("SERVER_PORT", "8080"),
		},
		JWT: JWTConfig{
			Secret:      getEnv("JWT_SECRET", "recall-tracking-secret-key"),
			ExpireHours: expireHours,
		},
		Upload: UploadConfig{
			Path:         getEnv("UPLOAD_PATH", "./uploads"),
			MaxSizeBytes: maxSize,
		},
	}

	return nil
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func GetDSN() string {
	return AppConfig.DB.User + ":" + AppConfig.DB.Password +
		"@tcp(" + AppConfig.DB.Host + ":" + AppConfig.DB.Port + ")/" +
		AppConfig.DB.Name + "?charset=utf8mb4&parseTime=True&loc=Local"
}

func GetDSNWithoutDB() string {
	return AppConfig.DB.User + ":" + AppConfig.DB.Password +
		"@tcp(" + AppConfig.DB.Host + ":" + AppConfig.DB.Port + ")/" +
		"?charset=utf8mb4&parseTime=True&loc=Local"
}
