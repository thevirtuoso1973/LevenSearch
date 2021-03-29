(function() {
    class LevenshteinAutomaton {
        constructor(input, k) {
            this.word = input;
            this.maxDistance = k;

            this.start = "0|0" // state format: "numberOfCharsConsumed|numberOfErrors"
            // states = {(i, j): 0 <= i <= len, 0 <= j <= k}

            let transition = {};
            for (let i = 0; i < this.word.length; ++i) {
                for (let j = 0; j < this.maxDistance; ++j) {
                    let currState = i.toString() + "|" + j.toString();

                    transition[currState + '-' + "any"] = [
                        i.toString() + "|" + (j+1).toString(),
                        (i+1).toString() + "|" + (j+1).toString()
                    ]
                    transition[currState + '-' + "epsilon"] = [
                        (i+1).toString() + "|" + (j+1).toString()
                    ]
                    transition[currState + '-' + this.word[i]] = [
                        (i+1).toString() + '|' + j.toString()
                    ]
                }
            }

            for (let i = 0; i < this.word.length; ++i) {
                let currState = i.toString() + "|" + this.maxDistance.toString();
                transition[currState + '-' + this.word[i]] = [
                    (i+1).toString() + '|' + j.toString()
                ]
            }
            for (let j = 0; j < this.maxDistance; ++j) {
                let currState = this.word.length.toString() + "|" + j.toString();
                transition[currState + '-' + "any"] = [
                    i.toString() + "|" + (j+1).toString(),
                ]
            }
            this.transition = transition;
        }

        isFinal(state) {
            return Number(state.split('|')[0]) === this.word.length;
        }

        isAccepted(string) {
            // TODO: implement return true if string is in language
        }
    }

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
     * returns the edit distance matrix
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
        return d
    }

    /*
     * returns the end index of a prefix of toCheck with Levenshtein distance at most n from query.
     * -1 if not found
     * TODO: use http://blog.notdot.net/2010/07/Damn-Cool-Algorithms-Levenshtein-Automata
     *
     */
    function getPrefixWithin(query, toCheck, n) {
        let matrix = lev(query, toCheck.substr(0, query.length + n));
        for (let x = 1; x <= query.length + n && x < matrix[query.length].length; ++x) {
            if (matrix[query.length][x] <= n) {
                return x;
            }
        }
        return 0;
    }

    function getTextElements() {
        return Array.from(document.body.getElementsByTagName("*"))
            .filter(e => e.childElementCount == 0 && e.textContent.length > 0)
    }

    let currQuery = "";
    let matches = [];
    let i = 0;

    /*
     * finds the next match, wrapping around if needed
     */
    function findNext() {
        if (!window.find(matches[i], 0, 0, 1, 0, 0, 0)) {
            // if it's false, we may have reached last match,
            // so move back to the start
            while (window.find(matches[i], 0, 1, 0, 0, 0, 0)) continue;
        }
        i = (i + 1) % matches.length;
    }

    function levenSearch(query, maxDist) {
        if (query === "") {
            return;
        }
        if (query === currQuery) {
            findNext();
            return;
        }

        currQuery = query;
        matches = [];
        i = 0;

        // maximum possible number of chars for a string to match
        let maxLengthCheck = query.length + maxDist;

        let text = document.body.innerText.trim();
        let words = text.split(' ');
        let numWords = words.length;
        for (let i = 0, j = 0; j < text.length; j += words[i++].length + 1) {
            let currStr = text.substr(j, maxLengthCheck);
            let endIndex = getPrefixWithin(query, text.substr(j), maxDist);
            if (endIndex > 0) {
                matches.push(currStr.substr(0, endIndex));
            }
        }

        findNext();
        console.log(matches);
    }

    function resetQuery() {
        // discards the highlight
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        } else if (document.selection) {
            document.selection.empty();
        }
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
