from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import json
from openai import OpenAI

app = FastAPI()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class EmailPayload(BaseModel):
    text: str

@app.post("/extract-task")
def extract_task(payload: EmailPayload):
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an AI task-extraction engine for email. "
                        "Read the incoming email text and extract a concise action summary "
                        "and a target reminder timestamp in YYYY-MM-DD HH:MM format (assume current year 2026). "
                        "Return ONLY valid JSON with keys: 'summary' and 'reminder_date'."
                    )
                },
                {
                    "role": "user",
                    "content": payload.text
                }
            ],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        return json.loads(content)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
