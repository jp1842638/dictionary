# 📖 English Dictionary

An English-to-English dictionary web app.
영어 단어를 검색하면 발음, 영어 정의, 예문, 동의어를 보여주는 깔끔한 영영사전입니다.

[Free Dictionary API](https://dictionaryapi.dev/)를 사용하며, 별도의 API 키나 회원가입이 필요 없습니다.

## ✨ Features

- 🔎 영어 단어 검색
- 🔊 발음 듣기 (오디오 제공 시)
- 📖 발음 기호 + **영어 정의** + 예문
- 🔗 동의어 / 반의어
- 🕘 최근 검색어 기록 (브라우저에 저장)
- 🌗 다크 / 라이트 모드 토글
- 📱 모바일 반응형

## 🚀 How to use

### 1) 로컬에서 실행
이 저장소를 클론하거나 다운로드한 뒤, `index.html`을 브라우저로 그냥 열면 됩니다.

```bash
git clone https://github.com/jp1842638/ai-dictionary.git
cd ai-dictionary
open index.html        # macOS
# 또는 그냥 파일 더블클릭
```

### 2) GitHub Pages로 배포

1. GitHub 저장소 페이지로 이동
2. **Settings** → 왼쪽 메뉴의 **Pages** 클릭
3. **Source** 에서 **Deploy from a branch** 선택
4. **Branch** 를 `main`, 폴더는 `/ (root)` 로 지정 후 **Save**
5. 1~2분 기다리면 다음 주소에서 사이트가 열립니다:
   👉 `https://jp1842638.github.io/ai-dictionary/`

## 🛠 Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript (빌드 도구 없음)
- [Free Dictionary API](https://api.dictionaryapi.dev/)

## 📁 Folder structure

```
ai-dictionary/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js          # 검색 로직 / UI
│   ├── dictionary.js   # 사전 API 호출
│   └── storage.js      # LocalStorage 헬퍼
├── README.md
└── .gitignore
```

## 📜 License

MIT