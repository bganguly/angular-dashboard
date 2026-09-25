variable "name_prefix" {
  description = "Prefix for all resource names"
  type        = string
  default     = "ang-dash"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "frontend_image" {
  description = "Full ACR image reference (server/repo:tag)"
  type        = string
}

variable "backend_url" {
  description = "URL of the Spring Boot backend (e.g. https://xxx.azurecontainerapps.io)"
  type        = string
}

variable "min_replicas" {
  description = "Minimum container replicas (0 = scale to zero)"
  type        = number
  default     = 0
}

variable "max_replicas" {
  type    = number
  default = 2
}
