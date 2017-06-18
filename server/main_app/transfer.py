import requests
import json


def get_token():
    url = "https://hackathon.postbank.de/bank-api/gold/postbankid/token"

    querystring = {"username": "HackathonSep21", "password": "hat0814"}

    headers = {
        'api-key': "485431360021fc31",
        'device-signature': "485431360021fc31",
        'cache-control': "no-cache"
    }

    response = requests.request(
        "POST", url, headers=headers, params=querystring)
    return json.loads(response.text)["token"]

def get_order_id(token):
    url = "https://hackathon.postbank.de/bank-api/gold/postbankid/credittransfer"

    payload = "{\r\n    \"messages\": [],\r\n    \"authorizationDevice\": {\r\n        \"messages\": [],\r\n        \"identifier\": \"463877\",\r\n        \"method\": \"bestSign\",\r\n        \"numberOfFailedAttempts\": 0,\r\n        \"authorizationState\": \"SELECTED\",\r\n        \"preferred\": false,\r\n        \"aliasName\": \"HackathonSep21\",\r\n        \"links\": []\r\n      },\r\n    \"state\": null,\r\n    \"creditTransfer\": {\r\n        \"messages\": [],\r\n        \"creditTransferId\": null,\r\n        \"amount\": \"1337\",\r\n        \"recipient\": {\r\n            \"messages\": [],\r\n            \"iban\": \"DE55100100100001741100\",\r\n            \"bic\": \"PBNKDEFF\",\r\n            \"paymentName\": \"Mariu Freudeaeqz\",\r\n            \"bankName\": \"Postbank\",\r\n            \"accountNumber\": \"1741100\",\r\n            \"accountHolder\": \"Mariu Freudeaeqz\",\r\n            \"links\": []\r\n        },\r\n        \"sender\": {\r\n            \"messages\": [],\r\n            \"iban\": \"DE53100100100005611145\",\r\n            \"bic\": \"PBNKDEFF\",\r\n            \"paymentName\": \"Maria Hassaeqw\",\r\n            \"bankName\": \"Postbank\",\r\n            \"accountNumber\": \"625034119\",\r\n            \"accountHolder\": \"Maria Hassaeqw\",\r\n            \"links\": []\r\n        },\r\n        \"purpose\": [\r\n            \"Bestechungsgeld\",\r\n            \"\",\r\n            \"\",\r\n            \"\"\r\n        ],\r\n        \"bookingDate\": 1475397795000,\r\n        \"links\": []\r\n    },\r\n    \"orderId\": null\r\n}"
    headers = {
        'api-key': "485431360021fc31",
        'device-signature': "485431360021fc31",
        'x-auth': token,
        'content-type': "application/json",
        'cache-control': "no-cache"
    }

    response = requests.request(
        "POST", url, data=payload, headers=headers)
    return json.loads(response.text)["orderId"]


def confirm_order(token, order_id):
    url = "https://hackathon.postbank.de:443/bank-api/gold/postbankid/credittransfer/accounts/DE53100100100005611145/orders/" + order_id

    headers = {
        'api-key': "485431360021fc31",
        'device-signature': "485431360021fc31",
        'x-auth': token,
        'content-type': "application/json",
        'cache-control': "no-cache"
    }

    response = requests.request("GET", url, headers=headers)
    return response.text

def transfer():
    token = get_token()
    order_id = get_order_id(token)
    return confirm_order(token, order_id)
