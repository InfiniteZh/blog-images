function GPT(t) {
    function createAndInsertElement() {
        removeExistingElement();
        let targetElement = document.querySelector(GPT_postSelector);
        if (!targetElement) {
            const maxAttempts = 20, interval = 300;
            let attempts = 0;
            const intervalId = setInterval(() => {
                attempts++;
                targetElement = document.querySelector(GPT_postSelector);
                if (targetElement || attempts * interval >= maxAttempts) {
                    clearInterval(intervalId);
                    if (!targetElement) console.log("超时未找到元素");
                }
            }, interval);
        }

        const container = document.createElement("div");
        container.className = "post-GPT";

        const titleDiv = document.createElement("div");
        titleDiv.className = "GPT-title";
        container.appendChild(titleDiv);

        const icon = document.createElement("i");
        icon.className = "GPT-title-icon";
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48px" height="48px" viewBox="0 0 48 48">...</svg>';
        titleDiv.appendChild(icon);

        const titleText = document.createElement("div");
        titleText.className = "GPT-title-text";
        titleText.textContent = typeof GPT_Title === "undefined" ? "AI摘要" : GPT_Title;
        titleDiv.appendChild(titleText);

        const tag = document.createElement("div");
        tag.className = "GPT-tag";
        tag.id = "GPT-tag";
        tag.textContent = typeof GPT_Name === "undefined" ? "GPT" : GPT_Name;
        titleDiv.appendChild(tag);

        const explanation = document.createElement("div");
        explanation.className = "GPT-explanation";
        explanation.innerHTML = '生成中...<span class="blinking-cursor"></span>';
        container.appendChild(explanation);

        targetElement.insertBefore(container, targetElement.firstChild);
    }

    function removeExistingElement() {
        const existingElement = document.querySelector(".post-GPT");
        if (existingElement) existingElement.parentElement.removeChild(existingElement);
    }

    function getTitleAndContent() {
        try {
            const title = document.title;
            const postElement = document.querySelector(GPT_postSelector);
            if (!postElement) {
                console.warn("GPT：找不到文章容器。");
                return "";
            }

            const paragraphs = postElement.getElementsByTagName("p");
            const headers = postElement.querySelectorAll("h1, h2, h3, h4, h5");
            let content = Array.from(headers).map(h => h.innerText).join(" ") + " " + Array.from(paragraphs).map(p => p.innerText.replace(/https?:\/\/[^\s]+/g, "")).join(" ");
            content = title + " " + content;
            const wordLimit = typeof GPT_wordLimit === "undefined" ? 1000 : GPT_wordLimit;
            return content.slice(0, wordLimit);
        } catch (error) {
            console.error("GPT错误：获取文章内容失败。", error);
            return "";
        }
    }

    async function fetchGPTContent() {
        const currentPath = document.URL.split('/').filter(Boolean).pop();
        const url = `https://cdn.jsdelivr.net/gh/InfiniteZh/blog-images/description/${currentPath}.txt`;
        try {
            const response = await fetch(url);
            if (response.ok) {
                const text = await response.text();
                return { summary: text };
            } else {
                throw new Error('Failed to fetch GPT results');
            }
        } catch (error) {
            console.error('Error fetching GPT results:', error);
            return 'Failed to fetch GPT results';
        }
    }

    function showAIExplanation(summary) {
        const explanation = document.querySelector(".GPT-explanation");
        if (!explanation) return;

        explanation.style.display = "block";
        explanation.innerHTML = '生成中...<span class="blinking-cursor"></span>';

        let index = 0;
        const interval = setInterval(() => {
            if (index < summary.length) {
                explanation.innerHTML = summary.slice(0, index + 1) + '<span class="blinking-cursor"></span>';
                index++;
            } else {
                clearInterval(interval);
                explanation.innerHTML = summary;
            }
        }, 25);
    }

    function initialize() {
        createAndInsertElement();
        const content = getTitleAndContent();
        if (content) {
            fetchGPTContent().then(response => {
                const summary = response.summary;
                showAIExplanation(summary);
            });
        }
    }

    function handleURLMatch() {
        if (typeof GPT_postURL !== "undefined") {
            try {
                const urlPattern = new RegExp("^" + GPT_postURL.split(/\*+/).map(part => part.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")).join(".*") + "$");
                const currentURL = window.location.href;
                if (urlPattern.test(currentURL)) {
                    handleBlacklist();
                } else {
                    console.log(`GPT：当前 URL '${currentURL}' 不符合规则 '${GPT_postURL}'，不执行摘要功能。`);
                }
            } catch (error) {
                console.error("GPT：自定义链接规则错误，不执行摘要功能", error);
            }
        } else {
            handleBlacklist();
        }
    }

    function handleBlacklist() {
        if (typeof GPT_blacklist !== "undefined") {
            fetch(GPT_blacklist)
                .then(response => response.json())
                .then(data => {
                    const blacklist = data.blackurls;
                    const currentURL = window.location.href;
                    const isBlacklisted = blacklist.some(pattern => new RegExp("^" + pattern.replace(/\*/g, ".*") + "$").test(currentURL));
                    if (!isBlacklisted) initialize();
                })
                .catch(error => console.error("Error fetching blacklist:", error));
        } else {
            initialize();
        }
    }

    t ? handleURLMatch() : document.addEventListener("DOMContentLoaded", handleURLMatch);
}

GPT(false);
document.addEventListener("pjax:complete", () => GPT(true));

(function (history) {
    const pushState = history.pushState;
    history.pushState = function(state, title, url) {
        const ret = pushState.call(history, state, title, url);
        setTimeout(() => {
            window.dispatchEvent(new Event('pushstate'));
        }, 0);
        return ret;
    };
})(window.history);

window.history.onpushstate = () => GPT(true);
