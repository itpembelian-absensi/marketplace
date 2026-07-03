import json
path = r'C:\Users\wisnu\.gemini\antigravity-ide\brain\1244b1fc-dc76-4758-85fd-5cb40dd9922e\.system_generated\logs\transcript.jsonl'
found_text = ''
with open(path, 'r', encoding='utf-8') as f:
    for line in f:
        if 'ordersTbody' in line and 'addEventListener' in line:
            try:
                data = json.loads(line)
                found_text += str(data) + '\n---\n'
            except Exception as e: pass
with open('extract2.txt', 'w', encoding='utf-8') as f:
    f.write(found_text)
