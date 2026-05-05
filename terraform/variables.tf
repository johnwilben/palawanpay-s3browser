variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "ap-southeast-1"
}

variable "aws_account_id" {
  description = "AWS Account ID where to deploy"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where Client VPN is attached"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ALB and ECS (minimum 2)"
  type        = list(string)
}

variable "client_vpn_cidr" {
  description = "Client VPN CIDR block for security group rules"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "s3browser"
}

variable "environment" {
  description = "Environment (dev/prod)"
  type        = string
  default     = "prod"
}

variable "cognito_user_pool_id" {
  description = "Existing Cognito User Pool ID"
  type        = string
  default     = "ap-southeast-1_ieR5X01hf"
}

variable "cognito_user_pool_arn" {
  description = "Existing Cognito User Pool ARN"
  type        = string
}

variable "cognito_client_id" {
  description = "Existing Cognito App Client ID"
  type        = string
}

variable "identity_store_id" {
  description = "IAM Identity Center Identity Store ID"
  type        = string
  default     = "d-96677c10e5"
}

variable "container_cpu" {
  description = "ECS Task CPU units"
  type        = number
  default     = 256
}

variable "container_memory" {
  description = "ECS Task memory (MB)"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}
