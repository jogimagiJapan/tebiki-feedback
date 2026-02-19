const GAS_API_URL = 'YOUR_GAS_DEPLOY_URL';

const videoInput = document.getElementById('videoUrl');
const titleBox = document.getElementById('videoTitleBox');
const validation = document.getElementById('urlValidationMsg');
const accountInput = document.getElementById('accountName');

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
        // 元のドメインを維持したまま、台帳検索用の正規化URL(videos形式)を作成
        const canonicalUrl = `https://${domain}/videos/${videoId}`;

        validation.innerHTML = '<span style="color:var(--success)">Tebiki動画URLを確認 ✅</span>';

        // タイトル取得（デバウンス処理）
        titleBox.innerText = "タイトルを確認中...";
        titleBox.style.display = "block";

        timeoutId = setTimeout(() => {
            // fetch APIを使用したタイトル取得 (GAS doGet)
            const fetchUrl = `${GAS_API_URL}?url=${encodeURIComponent(canonicalUrl)}`;

            fetch(fetchUrl)
                .then(response => response.json())
                .then(data => {
                    titleBox.innerText = `タイトル: ${data.title || '取得できませんでした'}`;
                })
                .catch(error => {
                    console.error('Error fetching title:', error);
                    titleBox.innerText = "タイトルの取得に失敗しました";
                });
        }, 500);

    } else {
        validation.innerHTML = val ? '<span style="color:var(--accent)">無効な形式です</span>' : '';
        titleBox.style.display = "none";
    }
});

// 送信処理
document.getElementById('feedbackForm').onsubmit = function (e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const label = document.getElementById('btnLabel');

    // URLの再サニタイズ（送信データ用）
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
        timeMin: document.getElementById('timeMin').value,
        timeSec: document.getElementById('timeSec').value,
        category: document.getElementById('category').value,
        details: document.getElementById('details').value,
        accountName: accountInput.value
    };

    // fetch APIを使用したデータ送信 (GAS doPost)
    fetch(GAS_API_URL, {
        method: 'POST',
        body: JSON.stringify(data)
    })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(() => {
            document.getElementById('formContainer').style.display = 'none';
            document.getElementById('successUi').style.display = 'block';
        })
        .catch(error => {
            console.error('Error submitting form:', error);
            alert('送信に失敗しました。時間をおいて再度お試しください。');
        })
        .finally(() => {
            // UI復元 (エラー時のみ意味があるが共通処理として記述)
            btn.disabled = false;
            label.innerText = '送信する';
        });
};

// 文字数
document.getElementById('details').oninput = function () {
    document.getElementById('charCount').innerText = `${this.value.length} / 500`;
};

// Modal
const modal = document.getElementById('helpModal');
document.getElementById('helpTrigger').onclick = () => modal.style.display = 'flex';
document.getElementById('closeHelp').onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
