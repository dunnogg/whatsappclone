import axios from "axios";

export const sendMessage = async (idInstance: string, apiToken: string, phone: string, message: string) => {
    const BASE_URL = `https://1103.api.green-api.com/waInstance${idInstance}`;
    const chatId = `${phone}@c.us`;

    return axios.post(`${BASE_URL}/sendMessage/${apiToken}`, {
        chatId,
        message,
    });
};

export const getMessages = async (idInstance: string, apiToken: string) => {
    const BASE_URL = `https://1103.api.green-api.com/waInstance${idInstance}`;
    return axios.get(`${BASE_URL}/receiveNotification/${apiToken}`);
};

export const getChatHistory = async (idInstance: string, apiTokenInstance: string, chatId: string) => {
    const url = `https://1103.api.green-api.com/waInstance${idInstance}/getChatHistory/${apiTokenInstance}`;

    try {
        const response = await axios.post(url, {
            chatId: chatId,
            count: 20
        });

        // Фильтруем только текстовые сообщения
        return response.data.filter((msg: any) =>
            msg.typeMessage === "textMessage" ||
            msg.typeMessage === "extendedTextMessage"
        );
    } catch (error) {
        console.error("Ошибка получения истории чата:", error);
        return null;
    }
};



export const deleteNotification = async (idInstance: string, apiToken: string, receiptId: string) => {
    const BASE_URL = `https://1103.api.green-api.com/waInstance${idInstance}`;
    return axios.delete(`${BASE_URL}/deleteNotification/${apiToken}/${receiptId}`);
};

export const getAvatar = async (idInstance: string, apiTokenInstance: string, chatId: string) => {
    const url = `https://1103.api.green-api.com/waInstance${idInstance}/getAvatar/${apiTokenInstance}`;

    const payload = {
        "chatId": `${chatId}`
    };

    const headers = {
        'Content-Type': 'application/json'
    };

    try {
        const response = await axios.post(url, payload, { headers });
        return response.data;
    } catch (e) {
        console.error("Ошибка получения аватара:", e);
        return null;
    }

};

export const getSettings = async (idInstance: string, apiTokenInstance: string) => {
    try {
        const url = `https://1103.api.green-api.com/waInstance${idInstance}/getSettings/${apiTokenInstance}`;
        const response = await axios.get(url)
        return response.data;
    } catch (e) {
        console.error("Ошибка получения настроек:", e);
        return null;
    }
}

export const getContacts = async (idInstance: string, apiTokenInstance: string) => {
    const url = `https://1103.api.green-api.com/waInstance${idInstance}/getContacts/${apiTokenInstance}`;

    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("Ошибка получения контактов:", error);
        return null;
    }
};
