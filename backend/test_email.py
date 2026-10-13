import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

EMAIL_SENDER = os.getenv("EMAIL_SENDER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
CONTRACTOR_EMAIL = os.getenv("CONTRACTOR_EMAIL")

print(f"EMAIL_SENDER: {EMAIL_SENDER}")
print(f"EMAIL_PASSWORD configured: {'Yes' if EMAIL_PASSWORD else 'No'}")
print(f"CONTRACTOR_EMAIL: {CONTRACTOR_EMAIL}")

try:
    msg = MIMEMultipart()
    msg['From'] = EMAIL_SENDER
    msg['To'] = CONTRACTOR_EMAIL
    msg['Subject'] = "Road Health AI - Email Test"
    
    body = """
    This is a test email from Road Health AI.
    If you received this, email sending is working correctly.
    Gmail App Password is configured properly.
    """
    msg.attach(MIMEText(body, 'plain'))
    
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(EMAIL_SENDER, EMAIL_PASSWORD)
    server.sendmail(EMAIL_SENDER, CONTRACTOR_EMAIL, msg.as_string())
    server.quit()
    
    print("\nSUCCESS: Test email sent to", CONTRACTOR_EMAIL)
    print("Please check the inbox of", CONTRACTOR_EMAIL)
    
except Exception as e:
    print(f"\nFAILED: {str(e)}")
    print("\nPossible fixes:")
    print("1. Make sure EMAIL_PASSWORD in .env has no spaces")
    print("2. Make sure 2-Step Verification is ON for kauteshantanu80@gmail.com")
    print("3. Make sure the App Password was generated for 'Mail'")
