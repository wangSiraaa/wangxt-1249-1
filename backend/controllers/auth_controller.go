package controllers

import (
	"recall-tracking/models"
	"recall-tracking/pkg/middleware"
	"recall-tracking/pkg/response"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token    string      `json:"token"`
	UserInfo interface{} `json:"user_info"`
}

type UserInfo struct {
	ID       uint64 `json:"id"`
	Username string `json:"username"`
	RealName string `json:"real_name"`
	Role     string `json:"role"`
	DealerID uint64 `json:"dealer_id"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数错误: "+err.Error())
		return
	}

	var user models.User
	if err := models.DB.Where("username = ? AND status = 1", req.Username).First(&user).Error; err != nil {
		response.BadRequest(c, "用户名或密码错误")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		response.BadRequest(c, "用户名或密码错误")
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Username, user.RealName, user.Role, user.DealerID)
	if err != nil {
		response.InternalServerError(c, "生成令牌失败")
		return
	}

	userInfo := UserInfo{
		ID:       user.ID,
		Username: user.Username,
		RealName: user.RealName,
		Role:     user.Role,
		DealerID: user.DealerID,
		Phone:    user.Phone,
		Email:    user.Email,
	}

	response.Success(c, LoginResponse{
		Token:    token,
		UserInfo: userInfo,
	})
}

func GetCurrentUser(c *gin.Context) {
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")
	realName, _ := c.Get("real_name")
	role, _ := c.Get("role")
	dealerID, _ := c.Get("dealer_id")

	var user models.User
	if err := models.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		response.NotFound(c, "用户不存在")
		return
	}

	userInfo := UserInfo{
		ID:       userID.(uint64),
		Username: username.(string),
		RealName: realName.(string),
		Role:     role.(string),
		DealerID: dealerID.(uint64),
		Phone:    user.Phone,
		Email:    user.Email,
	}

	response.Success(c, userInfo)
}

func Logout(c *gin.Context) {
	response.Success(c, nil)
}
