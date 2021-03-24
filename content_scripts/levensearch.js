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

    /*
     * returns true if toCheck's Levenshtein distance is at most n from query
     */
    function isWithinDistance(query, toCheck, n) {
        if (toCheck.length > query.length) {
            return lev(query, toCheck.substr(0, query.length + n)) <= n;
        }
        return lev(query, toCheck) <= n;
    }

    function getTextElements() {
        return Array.from(document.body.getElementsByTagName("*"))
            .filter(e => e.childElementCount == 0 && e.textContent.length > 0)
    }

    const markerClass = "levensearch-mark";

    /*
     * mark the substring from [i,j)
     */
    function markElement(e, i, j) {
        let html = e.innerHTML;
        e.innerHTML =
            e.textContent.substring(0, i)
            + `<mark class="${markerClass}">`
            + e.textContent.substring(i,j)
            + '</mark>'
            + e.textContent.substring(j);
    }

    function levenSearch(query, maxDist) {
        resetQuery();

        // maximum number of chars for a string to match
        let maxLengthCheck = query.length + maxDist;

        let elements = getTextElements();
        console.log(`Searching through ${elements.length} elements.`);
        elements.forEach(e => {
            // TODO: properly iterate through text, may need to change
            // getTextElements
            let text = e.textContent;
            let words = text.split(' ');
            let numWords = words.length;
            for (let i = 0, j = 0; j < text.length; j += words[i++].length + 1) {
                if (isWithinDistance(query, text.substr(j), maxDist)) {
                    markElement(e, j, j + maxLengthCheck);
                }
            }
        });
        console.log("Done searching.");
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
