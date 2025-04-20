from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import speech_recognition as sr
# from pydub import AudioSegment  # Commented out for debugging

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    if 'file' not in request.files:
        print("No file part in request.")
        return jsonify({'text': 'No file uploaded'}), 400

    uploaded_file = request.files['file']
    original_filename = uploaded_file.filename
    file_ext = os.path.splitext(original_filename)[1].lower()

    print(f"Uploaded filename: {original_filename}")
    print(f"File extension: {file_ext}")
    print(f"MIME type: {uploaded_file.content_type}")

    temp_input = 'temp_input' + file_ext
    temp_wav = 'temp_output.wav'

    try:
        uploaded_file.save(temp_input)
        print(f"Saved input file as: {temp_input}")
    except Exception as e:
        print(f"Failed to save uploaded file: {e}")
        return jsonify({'text': f"Error saving file: {str(e)}"}), 500

    recognizer = sr.Recognizer()
    try:
        # # Convert non-wav audio to wav (commented out for debugging)
        # if file_ext != '.wav':
        #     print("Converting to WAV format...")
        #     audio = AudioSegment.from_file(temp_input)
        #     audio.export(temp_wav, format='wav')
        #     print(f"Exported WAV as: {temp_wav}")
        # else:
        #     os.rename(temp_input, temp_wav)
        #     print(f"Renamed to: {temp_wav}")

        # Debugging: use uploaded .wav file as-is
        temp_wav = temp_input

        print("Starting transcription...")
        with sr.AudioFile(temp_wav) as source:
            audio_data = recognizer.record(source)
            print("Audio data recorded.")
            text = recognizer.recognize_google(audio_data)
            print(f"Transcribed text: {text}")

        return jsonify({'text': text})

    except sr.UnknownValueError:
        print("Speech recognition could not understand the audio.")
        return jsonify({'text': "Could not understand audio"}), 400

    except sr.RequestError as e:
        print(f"Speech recognition API request failed: {e}")
        return jsonify({'text': "Speech API error occurred"}), 503

    except Exception as e:
        print(f"Transcription error: {e}")
        return jsonify({'text': f"Unexpected error: {str(e)}"}), 500

    finally:
        if os.path.exists(temp_wav):
            os.remove(temp_wav)
        if os.path.exists(temp_input) and temp_input != temp_wav:
            os.remove(temp_input)

if __name__ == '__main__':
    app.run(debug=True)
