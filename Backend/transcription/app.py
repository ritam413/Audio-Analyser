from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import speech_recognition as sr
import ffmpeg

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Convert any input audio to WAV using ffmpeg-python
def convert_to_wav(input_path, output_path):
    try:
        print(f"[FFMPEG] Converting {input_path} to {output_path}...")
        ffmpeg.input(input_path).output(output_path).run(overwrite_output=True)
        print("[FFMPEG] Conversion successful.")
    except ffmpeg.Error as e:
        print(f"[FFMPEG] Error during conversion:\n{e.stderr.decode()}")
        raise RuntimeError("Audio conversion failed")

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    if 'file' not in request.files:
        print("[ERROR] No file uploaded.")
        return jsonify({'text': 'No file uploaded'}), 400

    uploaded_file = request.files['file']
    original_filename = uploaded_file.filename
    file_ext = os.path.splitext(original_filename)[1].lower()

    print(f"[INFO] Uploaded: {original_filename} (.{file_ext})")

    temp_input = 'temp_input' + file_ext
    temp_wav = 'temp_output.wav'

    try:
        uploaded_file.save(temp_input)
        print(f"[INFO] Saved input to: {temp_input}")
    except Exception as e:
        print(f"[ERROR] Saving file failed: {e}")
        return jsonify({'text': f"File save error: {str(e)}"}), 500

    try:
        # Convert to WAV if needed
        if file_ext != '.wav':
            convert_to_wav(temp_input, temp_wav)
        else:
            temp_wav = temp_input  # Use as-is if already WAV

        recognizer = sr.Recognizer()
        with sr.AudioFile(temp_wav) as source:
            print("[INFO] Recording audio data...")
            audio_data = recognizer.record(source)
            print("[INFO] Audio data recorded. Transcribing...")

            text = recognizer.recognize_google(audio_data)
            print(f"[SUCCESS] Transcribed text: {text}")
            return jsonify({'text': text})

    except sr.UnknownValueError:
        print("[WARN] Speech not understood.")
        return jsonify({'text': "Could not understand audio"}), 400

    except sr.RequestError as e:
        print(f"[ERROR] Google API error: {e}")
        return jsonify({'text': "Speech recognition service error"}), 503

    except Exception as e:
        print(f"[ERROR] Unexpected transcription error: {e}")
        return jsonify({'text': f"Error: {str(e)}"}), 500

    finally:
        for f in [temp_input, temp_wav]:
            if os.path.exists(f):
                os.remove(f)

if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 10000))  # Default to 10000
    app.run(debug=False, host='0.0.0.0', port=port)