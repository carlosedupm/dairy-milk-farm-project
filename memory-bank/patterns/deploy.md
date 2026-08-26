# Padrões de deploy (resumo)

**Deployment Patterns**

- **Containerization**: Docker com multi-stage build
- **Orquestração**: Render para backend, Vercel para frontend
- **Environment Driven**: Configuração total via variáveis de ambiente
- **Health Checks**: Endpoints `/health` para verificação de saúde

### **CI/CD Patterns**

- **GitHub Actions**: Pipeline de CI/CD
- **Automated Testing**: Testes automáticos no pipeline
- **Docker Builds**: Builds automatizados de containers
- **Infrastructure as Code**: Terraform-ready



Detalhe operacional: [`../deploy-notes.md`](../deploy-notes.md) e [`../deploy/`](../deploy/).
