var api = {
  //  apiURL
  //  apikey
  //  deviceSignature
  //  username
  //  password
  //  token
}

var account = {
  // accountHolder
  // accountNumber
  // amount
  // bankName
  // bic
  // iban
  // productDescription
};

var getToken = function() {
  return $.ajax({
    "type": "POST",
    "url": `${api.url}/token?username=${api.username}&password=${api.password}`,
    "async": true,
    "crossDomain": true,
    "headers": {
      "api-key": api.key,
      "device-signature": api.deviceSignature,
      "cache-control": "no-cache"
    }
  });
}

var setToken = function(response) {
  api.token = response.token;
}

var getAccount = function() {
  return $.ajax({
    "type": "GET",
    "url": `account.json`,
    // "url": `${api.url}/accounts/giro/DE53100100100005611145`,
    "async": true,
    "crossDomain": true,
    "headers": {
      "api-key": api.key,
      "device-signature": api.deviceSignature,
      "x-auth": api.token,
      "cache-control": "no-cache"
    }
  });
}

var displayAccount = function(response) {
  response = JSON.parse(response);
  // CLear table
  $('#account tbody > tr').remove();
  account = response.accounts[1];
  $('#account').append(`<tr><td>Konto</td><td>${account.productDescription}</td><tr>`);
  $('#account').append(`<tr><td>IBAN</td><td>${account.iban}</td><tr>`);
  // $('#account').append(`<tr><td>BIC</td><td>${account.bic}</td><tr>`);
  $('#account').append(`<tr><td>Balance</td><td id="balance">${account.amount} EUR</td><tr>`);
}

var displayBalance = function(sBalance) {
  $('#balance').text(sBalance + " EUR");
}

var displayBalanceHistory = function(aTransactions) {
  // Prepare Balance History
  var history = {
    labels: [],
    series: [
      {
        data: []
      }
    ]
  };
  // Get history from transactions
  $.each(aTransactions.content, function(index, transaction) {
    // Get transaction data
    var balance = transaction.balance;
    var bookingDate = new Date(transaction.bookingDate);
    var bookingDay= bookingDate.getDate() - 1;
    var bookingMonth= bookingDate.getMonth() + 1;
    var bookingDayMonth = bookingDay + "." + bookingMonth;
    // Save balance history for chart
    history.labels.push(bookingDayMonth);
    history.series[0].data.push(balance);
  });
  /* Initialize the chart with the above settings */
  new Chartist.Line('#my-chart', history, {
     showPoint: false
  });
}

var getTransactions = function(sURL = "transactions.json", iNumberOfTransactions = 5) {
  return $.ajax({
    "type": "GET",
    "url": sURL,
    // "url": `${api.url}/accounts/giro/DE53100100100005611145/transactions?size=${iNumberOfTransactions}`,
    "async": true,
    "crossDomain": true,
    "headers": {
      "api-key": api.key,
      "device-signature": api.deviceSignature,
      "x-auth": api.token,
      "cache-control": "no-cache"
    }
  });
}

var displayTransactions = function(aTransactions) {
  aTransactions = JSON.parse(aTransactions);
  // CLear table
  $('#transactions tbody > tr').remove();
  // Display new transactions
  $.each(aTransactions.content, function(index, transaction) {
    // Set transaction data
    var balance = transaction.balance;
    var bookingDate = new Date(transaction.bookingDate).toISOString().slice(0, 10);
    var amount = transaction.amount;
    var purpose = transaction.purpose[0];
    var accountHolder = transaction.reference.accountHolder;
    // Append transaction to dashboard table
    $('#transactions').append(`<tr><td>${bookingDate}</td><td>${amount}</td><td>${purpose}</td><td>${accountHolder}</td></tr>`);
  });
  // Show balance history chart
  displayBalanceHistory(aTransactions);
  // Show balance after latest transaction
  displayBalance(aTransactions.content[aTransactions.content.length-1].balance);
}

var refreshTransactions = function() {
  // Fetch Token
  // getToken().then(setToken).then(function() {
    // Get Account Information
    getAccount().then(displayAccount);
    // Get Transactions
    getTransactions("transactions.json").then(displayTransactions).then(function(){
      // setTimeout(refreshTransactions, 1000);
    });
  // });
}

var getAuthDevices = function() {
  // Implemented in Server
}

var doTransaction  = function() {
  // Implemented in Server
}

$.getJSON("api.json", function(response) {
  // Get API Settings and Credentials
  api = response;
}).then(refreshTransactions);

$(document).keypress(function( event ) {
  if ( event.key === "r" ) {
     event.preventDefault();
     getTransactions("transactions_update.json").then(displayTransactions);
  }
});