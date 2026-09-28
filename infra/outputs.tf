output "frontend_url" {
  description = "Public HTTPS URL of the Angular Static Web App"
  value       = "https://${azurerm_static_site.spa.default_host_name}"
}

output "deploy_token" {
  description = "Deployment API key — used by swa CLI and CI pipelines"
  value       = azurerm_static_site.spa.api_key
  sensitive   = true
}
