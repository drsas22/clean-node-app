from flask import Flask, request, jsonify
import os
from groq import Groq
from dotenv import load_dotenv   # add this

load_dotenv()   # this loads .env variables

app = Flask(__name__)

# Read API key from .env
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY not found in .env")

client = Groq(api_key=api_key)

@app.route("/ask", methods=["POST"])
def ask():
    try:
        data = request.get_json()
        question = data.get("question") if data else None

        if not question:
            return jsonify({"success": False, "error": "Question required"})

        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": question}],
            max_completion_tokens=1024
        )

        answer = completion.choices[0].message.content

        return jsonify({"success": True, "answer": answer})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

if __name__ == "__main__":
    app.run(port=5000)