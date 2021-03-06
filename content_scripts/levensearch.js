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
                    (i+1).toString() + '|' + this.maxDistance.toString()
                ]
            }
            for (let j = 0; j < this.maxDistance; ++j) {
                let currState = this.word.length.toString() + "|" + j.toString();
                transition[currState + '-' + "any"] = [
                    this.word.length.toString() + "|" + (j+1).toString(),
                ]
            }
            this.transition = transition;
        }

        isFinal(state) {
            return Number(state.split('|')[0]) === this.word.length;
        }

        /*
         * returns the first accepted prefix of string, or "" if none are accepted
         */
        getAcceptedPrefix(string, log) {
            let currStates = [[this.start, 0]];

            while (currStates.length > 0
                   && currStates.filter(s => this.isFinal(s[0])).length == 0) {
                let currCount = currStates.length;
                for (let i = 0; i < currCount; ++i) {
                    let state = currStates.shift(); // pop from front
                    if (this.isFinal(state[0])) {
                        return string.substr(0, state[1]);
                    }

                    if (state[0] + '-' + "epsilon" in this.transition) {
                        currStates.push(
                            ...this.transition[state[0] + '-' + "epsilon"].map(s => [s, state[1]])
                        );
                    }
                    if (state[0] + '-' + "any" in this.transition) {
                        currStates.push(
                            ...this.transition[state[0] + '-' + "any"].map(s => [s, state[1] + 1])
                        );
                    }
                    if (state[0] + '-' + string[state[1]] in this.transition) {
                        currStates.push(
                            ...this.transition[state[0] + '-' + string[state[1]]].map(s => [s, state[1] + 1])
                        );
                    }
                }
            }

            for (let state of currStates) {
                if (this.isFinal(state[0])) {
                    return string.substr(0, state[1]);
                }
            }
            return "";
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
     * returns some prefix of toCheck with Levenshtein distance at most n from query.
     * empty string if none satisfy.
     *
     */
    function getPrefixWithin(query, toCheck, n) {
        let matrix = lev(query, toCheck.substr(0, query.length + n));
        for (let x = 1; x <= query.length + n && x < matrix[query.length].length; ++x) {
            if (matrix[query.length][x] <= n) {
                return toCheck.substr(0, x);
            }
        }
        return "";
    }

    function getTextElements() {
        return Array.from(document.body.getElementsByTagName("*"))
            .filter(e => e.childElementCount == 0 && e.textContent.length > 0)
    }

    let currQuery = "";
    let currDist = 1;
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
            return "";
        }
        if (query === currQuery && maxDist === currDist) {
            findNext();
            return "";
        }

        resetQuery(query, maxDist);

        // maximum possible number of chars for a string to match
        let maxLengthCheck = query.length + maxDist;

        let text = document.body.innerText.trim();
        let words = text.split(/\s/);
        let numWords = words.length;

        let timeBefore = performance.now();

        let automaton = new LevenshteinAutomaton(query, maxDist);
        for (let i = 0, j = 0; j < text.length; j += words[i++].length + 1) {
            let prefix = automaton.getAcceptedPrefix(text.substr(j));
            if (prefix !== "") {
                matches.push(prefix);
            }
        }
        let timeAfter = performance.now();

        findNext();

        console.log(matches);
        return `Found ${matches.length} matches in ${timeAfter-timeBefore}ms`;
    }

    function resetQuery(newQ, newDist) {
        currQuery = newQ;
        currDist = newDist;
        matches = [];
        i = 0;

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
            return Promise.resolve(levenSearch(message.query,
                                               message.maxDistance));
        } else if (message.command === "reset") {
            resetQuery("");
        }
    });
})();
