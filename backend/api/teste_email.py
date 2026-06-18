import smtplib
import os
from dotenv import load_dotenv

# O override=True força o Python a esquecer o cache e ler o arquivo .env de novo
load_dotenv(override=True) 

EMAIL_HOST = os.getenv('EMAIL_HOST')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USER = os.getenv('EMAIL_USER')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')
EMAIL_FROM = os.getenv('EMAIL_FROM')

print(f"🔌 Tentando conectar no servidor: {EMAIL_HOST}")
print(f"👤 Usando o login: {EMAIL_USER}")

try:
    # O debuglevel=1 faz o Python fofocar tudo o que o Brevo falar pra ele
    server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
    server.set_debuglevel(1) 
    server.starttls()
    server.login(EMAIL_USER, EMAIL_PASSWORD)
    
    msg = f"Subject: Teste de Conexao\n\nEste e um e-mail de teste da Al Capone."
    server.sendmail(EMAIL_FROM, EMAIL_FROM, msg)
    server.quit()
    print("\n✅ E-MAIL ENVIADO COM SUCESSO!")
except Exception as e:
    print(f"\n❌ ERRO FATAL: {e}")