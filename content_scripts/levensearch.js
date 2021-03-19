(function() {
    /**
     * Check and set a global guard variable.
     * If this content script is injected into the same page again,
     * it will do nothing next time.
     */
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;

    function min(a, b, c) {
        if (a < b) {
            return a < c ? a : c;
        }
        return b < c ? b : c;
    }

    /*
     * computes the levenshtein distance between a,b
     */
    function lev(a, b) {
        let d = [];
        for (let i = 0; i <= a.length; ++i) {
            let currRow = [];
            for (let j = 0; j <= b.length; ++j) {
                currRow.push(0);
            }
            d.push(currRow);
        }

        for (let i = 1; i <= a.length; ++i) {
            d[i][0] = i;
        }
        for (let j = 1; j <= b.length; ++j) {
            d[0][j] = j;
        }

        for (let i = 1; i <= a.length; ++i) {
            for (let j = 1; j <= b.length; ++j) {
                let cost = a[i-1] === b[j-1] ? 0 : 1;
                d[i][j] = min(d[i-1][j]+1,
                              d[i][j-1]+1,
                              d[i-1][j-1] + cost);
            }
        }
        return d[a.length][b.length]
    }

    function getTextElements() {
        return Array.from(document.body.getElementsByTagName("*"))
            .filter(e => e.childElementCount == 0 && e.textContent.length > 0)
    }

    const markerClass = "levensearch-mark";

    function markElement(e) {
        let html = e.innerHTML;
        e.innerHTML =
            `<mark class="${markerClass}">`
            + e.textContent
            + '</mark>';
    }

    function levenSearch(query, maxDist) {
        resetQuery();

        let elements = getTextElements();
        elements.filter(e => lev(e.textContent, query) <= maxDist).forEach(markElement);
    }

    function resetQuery() {
        let toRemove = Array.from(
            document.body.getElementsByClassName(markerClass)
        );
        toRemove.forEach(e => {
            e.outerHTML = e.innerHTML;
        });
    }

    /**
     * Listen for messages from the background script.
     */
    browser.runtime.onMessage.addListener((message) => {
        if (message.command === "search") {
            levenSearch(message.query, message.maxDistance);
        } else if (message.command === "reset") {
            resetQuery();
        }
    });

})();
