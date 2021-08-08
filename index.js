// noinspection JSUnresolvedVariable,JSUnresolvedFunction, JSUnusedGlobalSymbols - it's all in the Testcafé reporter contract

const Sentry = require("@sentry/node");
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const sentryDsn = process.env.SENTRY_DSN;
Sentry.init({
    dsn: sentryDsn,
    environment: process.env.ENVIRONMENT,
});

async function printBrowserConsoleOutput() {
    // TODO: get browser console output
    // const { error } = await t.getBrowserConsoleMessages();
    // console.log(await t.getBrowserConsoleMessages());
}

function attachmentUrlFromDsn(dsn = sentryDsn, eventId = '2560070167') {
    //TODO: cache DSN parts, and/or let Sentry parse the DSN
    // noinspection JSUnusedLocalSymbols -- no warning for unused DSN components
    const [_0, protocol, user, _3, path1, path2, projectId] = dsn.split(/(https:\/\/|.ingest.sentry.io\/|@)/);
    return `https://o865587.ingest.sentry.io/api/${projectId}/events/${eventId}/attachments/?sentry_key=${user}&sentry_version=7&sentry_client=custom-javascript`;
}

module.exports = function() {
    return {
        noColors: true,
        sentryTags: null,
        reportTaskStart() {
        },

        reportFixtureStart(name, path, meta) {
            this.currentFixtureName = name;
            this.sentryTags = meta != null && meta.sentryTags;
        },

        async reportTestDone(name, testRunInfo, meta) {
            const hasErr = !!testRunInfo.errs.length;
            const sentryTags = (meta !== null && meta.sentryTags) ||
                this.sentryTags;

            if (hasErr) {

                await printBrowserConsoleOutput();

                if (sentryTags) {
                    Sentry.configureScope(scope => {
                        scope.setTags(sentryTags);
                    });
                }

                // noinspection JSUnresolvedVariable
                const scrShPath = testRunInfo.screenshots[0].screenshotPath;
                testRunInfo.errs.forEach((error, id) => {
                    const eventId = this.sendErrorToSentry(error, id, name);
                    this.uploadScreenshot(scrShPath, eventId);
                });
            }
        },

        reportTaskDone() {},

        sendErrorToSentry(error, id, testName) {
            return Sentry.captureEvent({
                message: `[Testcafe] ${error.errMsg} in ${this.currentFixtureName} ${testName}`,
                level: Sentry.Severity.Error,
                extra: {
                    error: this.formatError(error, `${id + 1} `)
                }
            });
        },

        uploadScreenshot(scrShPath, id) {
            const data = new FormData();
            data.append('my-attachment', fs.createReadStream(scrShPath));

            const config = {
                method: 'post',
                url: attachmentUrlFromDsn(sentryDsn, id),
                headers: {
                    ...data.getHeaders()
                },
                data: data
            };

            axios(config)
                .then(() => {
                    console.log(`screenshot was uploaded for ${id}`);
                })
                .catch(function (error) {
                    console.log(error);
                });


        }
    };
};
