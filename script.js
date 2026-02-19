const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyLiqKszS6jvCWd9LkpQ8MkIbfie_JI45gT3UP-2aKPWQdJnECFIR1kqAYP_yaDwT0/exec';

const videoInput = document.getElementById('videoUrl');
const titleBox = document.getElementById('videoTitleBox');
const validation = document.getElementById('urlValidationMsg');
const accountInput = document.getElementById('accountName');

// タイトルの保持用
let currentVideoTitle = "";

// 初期化: アカウント名復元 & フォーカス
window.onload = () => {
    const saved = localStorage.getItem('tebikiAccount');
    if (saved) accountInput.value = saved;
    videoInput.focus();
};

// URLバリデーション & タイトル取得
let timeoutId;
videoInput.addEventListener('input', () => {
    clearTimeout(timeoutId);
    const val = videoInput.value.trim();

    // 改良版正規表現: サブドメインを保持しつつ、videos形式とcourses形式の両方に対応
    const tebikiRegex = /https:\/\/([\w.-]+\.tebiki\.jp)\/(?:videos|courses\/\d+\/play)\/(\d+)/;
    const match = val.match(tebikiRegex);

    if (match) {
        const domain = match[1];
        const videoId = match[2];
        const canonicalUrl = `https://${domain}/videos/${videoId}`;

        validation.innerHTML = '<span style="color:var(--success)">Tebiki動画URLを確認 ✅</span>';

        // タイトル取得（デバウンス処理）
        currentVideoTitle = ""; // リセット
        titleBox.innerText = "タイトルを確認中...";
        titleBox.style.display = "block";

        timeoutId = setTimeout(() => {
            const fetchUrl = `${GAS_API_URL}?url=${encodeURIComponent(canonicalUrl)}`;

            // GETリクエストでタイトル取得 (CORS許可されている前提、またはJSONP等)
            // タイトル取得は opaque response では中身が読めないため、
            // GAS側で適切な CORS ヘッダーが返っている必要があります。
            fetch(fetchUrl)
                .then(response => response.json())
                .then(data => {
                    currentVideoTitle = data.title || "不明なタイトル";
                    titleBox.innerText = `タイトル: ${currentVideoTitle}`;
                })
                .catch(error => {
                    console.error('Error fetching title:', error);
                    titleBox.innerText = "タイトルの取得に失敗しました (台帳未登録)";
                    currentVideoTitle = "タイトル取得失敗";
                });
        }, 500);

    } else {
        validation.innerHTML = val ? '<span style="color:var(--accent)">無効な形式です</span>' : '';
        titleBox.style.display = "none";
        currentVideoTitle = "";
    }
});

// 送信処理
document.getElementById('feedbackForm').onsubmit = function (e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const label = document.getElementById('btnLabel');

    const val = videoInput.value.trim();
    const tebikiRegex = /https:\/\/([\w.-]+\.tebiki\.jp)\/(?:videos|courses\/\d+\/play)\/(\d+)/;
    const match = val.match(tebikiRegex);

    if (!match) {
        alert("有効なTebiki動画URLを入力してください。");
        return;
    }

    const sanitizedUrl = `https://${match[1]}/videos/${match[2]}`;

    // UIを送信中に
    btn.disabled = true;
    label.innerHTML = '<div class="spinner"></div>';

    // メアド保存
    localStorage.setItem('tebikiAccount', accountInput.value);

    // フォームデータ
    const data = {
        videoUrl: sanitizedUrl,
        videoTitle: currentVideoTitle,
        timeMin: document.getElementById('timeMin').value,
        timeSec: document.getElementById('timeSec').value,
        category: document.getElementById('category').value,
        details: document.getElementById('details').value,
        accountName: accountInput.value
    };

    /**
     * fetch POST送信 (GAS API)
     * mode: 'no-cors' を指定し、不透明なレスポンスとして処理。
     * GASのリダイレクトによるブラウザのブロックを回避します。
     */
    fetch(GAS_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: JSON.stringify(data)
    })
        .then(() => {
            // no-cors モードではレスポンス内容が読めないため、
            // プロミスが解決した時点で送信成功（GASへリクエストが届いた）とみなします。
            document.getElementById('formContainer').style.display = 'none';
            document.getElementById('successUi').style.display = 'block';
        })
        .catch(error => {
            console.error('Submission error:', error);
            alert('送信中にエラーが発生しました。ネットワーク接続等を確認してください。');
        })
        .finally(() => {
            // UI復元
            btn.disabled = false;
            label.innerText = '送信する';
        });
};

// 文字数制限の表示
document.getElementById('details').oninput = function () {
    document.getElementById('charCount').innerText = `${this.value.length} / 500`;
};

// ヘルプモーダルの制御
const modal = document.getElementById('helpModal');
document.getElementById('helpTrigger').onclick = () => modal.style.display = 'flex';
document.getElementById('closeHelp').onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
