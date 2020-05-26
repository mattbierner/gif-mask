/* eslint-disable @typescript-eslint/no-var-requires */
export const getGiphy = () =>
    require('giphy-api')({
        https: true,
        apiKey: 'xs7bRYIa9L9pna4iOsnK56TaID5d8iRz'
    });