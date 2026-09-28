variable "name_prefix" {
  description = "Prefix for all resource names"
  type        = string
  default     = "ang-dash"
}

variable "location" {
  description = "Azure region (must support Azure Static Web Apps: eastus2, centralus, westus2, westeurope, eastasia)"
  type        = string
  default     = "eastus2"
}
