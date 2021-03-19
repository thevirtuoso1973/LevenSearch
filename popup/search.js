/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForSubmit() {
    function getQuery() {
        return document.getElementsByName("query")[0].value;
    }

    /**
     * perform a search using the query
     */
    function performSearch(tabs) {
        let searchQuery = getQuery();
        let levenshtein = 1;

        browser.tabs.sendMessage(tabs[0].id, {
            command: "search",
            query: searchQuery,
            maxDistance: levenshtein
        });
    }

    /**
     * This clears the search query.
     * send a "reset" message to the content script in the active tab.
     */
    function reset(tabs) {
        browser.tabs.sendMessage(tabs[0].id, {
            command: "reset"
        });
    }

    /**
     * Just log the error to the console.
     */
    function reportError(error) {
        console.error(`Could not search: ${error}`);
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            browser.tabs.query({active: true, currentWindow: true})
                .then(performSearch)
                .catch(reportError);
        }
    });

    document.addEventListener("click", (e) => {
        if (e.target.matches(".button-submit")) {
            browser.tabs.query({active: true, currentWindow: true})
                .then(performSearch)
                .catch(reportError);
        } else if (e.target.matches(".button-reset")) {
            browser.tabs.query({active: true, currentWindow: true})
                .then(reset)
                .catch(reportError);
        }
    });

    window.addEventListener("beforeunload", (e) => {
        browser.tabs.query({active: true, currentWindow: true})
            .then(reset)
            .catch(reportError);
    });
}

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError(error) {
    document.querySelector("#popup-content").classList.add("hidden");
    document.querySelector("#error-content").classList.remove("hidden");
    console.error(`Failed to execute levensearch content script: ${error.message}`);
    console.log(`${error.message}`);
}

/**
 * When the popup loads, inject a content script into the active tab,
 * and add a click handler.
 * If we couldn't inject the script, handle the error.
 */
browser.tabs.executeScript({file: "/content_scripts/levensearch.js"})
    .then(listenForSubmit)
    .catch(reportExecuteScriptError);
