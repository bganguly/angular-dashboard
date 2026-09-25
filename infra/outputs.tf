output "frontend_url" {
  description = "Public HTTPS URL of the Angular Container App"
  value       = "https://${azurerm_container_app.app.ingress[0].fqdn}"
}

output "acr_login_server" {
  value = azurerm_container_registry.acr.login_server
}
