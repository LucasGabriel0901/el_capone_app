import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def enviar_email(destinatario, assunto, corpo):
    host = os.getenv('EMAIL_HOST')
    port = os.getenv('EMAIL_PORT')
    user = os.getenv('EMAIL_USER')
    password = os.getenv('EMAIL_PASSWORD')
    sender = os.getenv('EMAIL_FROM')

    if not all([host, port, user, password, sender]):
        print("Aviso: Configurações de e-mail ausentes no .env")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = sender
        msg['To'] = destinatario
        msg['Subject'] = assunto
        msg.attach(MIMEText(corpo, 'plain', 'utf-8'))

        server = smtplib.SMTP(host, int(port))
        server.starttls()
        server.login(user, password)
        server.sendmail(sender, destinatario, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Erro ao enviar e-mail: {e}")
        return False

def enviar_email_cliente(agendamento):
    assunto = "Confirmação de Agendamento - Al Capone"
    corpo = f"""Olá, {agendamento['cliente_nome']}. Seu agendamento foi concluído com sucesso na Al Capone.

Serviço: {agendamento['servico_nome']}
Cabeleireiro: {agendamento['barbeiro_nome']}
Data: {agendamento['data']}
Horário: {agendamento['hora']}
Forma de pagamento: {agendamento['forma_pagamento']}"""
    return enviar_email(agendamento['cliente_email'], assunto, corpo)

def enviar_email_barbeiro(agendamento):
    assunto = "Novo Agendamento - Al Capone"
    corpo = f"""Novo agendamento recebido.

Cliente: {agendamento['cliente_nome']}
Telefone: {agendamento['cliente_telefone']}
E-mail: {agendamento['cliente_email']}
Serviço: {agendamento['servico_nome']}
Data: {agendamento['data']}
Horário: {agendamento['hora']}
Valor: R$ {agendamento['valor']:.2f}
Pagamento: {agendamento['forma_pagamento']}"""
    return enviar_email(agendamento['barbeiro_email'], assunto, corpo)

def enviar_whatsapp_barbeiro(agendamento):
    api_url = os.getenv('WHATSAPP_API_URL')
    token = os.getenv('WHATSAPP_TOKEN')
    phone_id = os.getenv('WHATSAPP_PHONE_NUMBER_ID')
    barber_phone = os.getenv('BARBER_WHATSAPP_NUMBER')

    if not all([api_url, token, phone_id, barber_phone]):
        print("Aviso: Configurações de WhatsApp ausentes no .env")
        return False

    mensagem = f"""Novo agendamento na Al Capone 💈\n\nCliente: {agendamento['cliente_nome']}\nTelefone: {agendamento['cliente_telefone']}\nServiço: {agendamento['servico_nome']}\nData: {agendamento['data']}\nHorário: {agendamento['hora']}\nValor: R$ {agendamento['valor']:.2f}\nPagamento: {agendamento['forma_pagamento']}"""

    try:
        print(f"[Simulação de Disparo WA] Para {barber_phone}:\n{mensagem}")
        return True
    except Exception as e:
        print(f"Erro ao enviar WhatsApp: {e}")
        return False