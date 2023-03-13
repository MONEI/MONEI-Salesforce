
function handleTabChange(e){
  const isMoneiContentSelected = e.target.hash === '#monei-content';
  if(!isMoneiContentSelected){
    showContinueButton();
    return;
  }else{
    hideContinueButton();
  }
}

//Shows continue button if it's not visible
function showContinueButton() {
  var paymentButton = document.querySelector('button[value=submit-payment]');
  var paymentMonei = document.querySelector('.monei-button');
  if (paymentButton.style.display !== '') {
      paymentButton.style.display = '';
      paymentMonei.style.display = 'none';
  }
}

// Hides continue button if it's not hidden
function hideContinueButton() {
  var paymentButton = document.querySelector('button[value=submit-payment]');
  var paymentMonei = document.querySelector('.monei-button');
  if (paymentButton.style.display !== 'none') {
    paymentButton.style.display = 'none';
    paymentMonei.style.display = '';
  }
}


const parseQuery = (queryString) => {
  const query = {};
  const pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
  pairs.forEach((item) => {
    const pair = item.split('=');
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  });
  return query;
};

(async () => {
  const totalCart = document.querySelector('.grand-total-sum').innerHTML;
  document.querySelector('[data-total]').innerText = totalCart;

  if ($('.payment-options .nav-item').data('method-id') === 'CREDIT_CARD') {
    document.querySelector('.monei-button').style.display = 'none';
  }else if($('.payment-options .nav-item').data('method-id') === 'Monei'){
    document.querySelector('button[value=submit-payment]').style.display = 'none';
  }

  $('.payment-options[role=tablist] a[data-toggle="tab"]').on('shown.bs.tab', async (e) =>{ 
    handleTabChange(e);
  });

  // Listen to submit event on the payment form
  $('body').on('click', '.monei-button', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    $('#email').removeClass('is-invalid');
    $('#phoneNumber').removeClass('is-invalid');
    try { 
        var url = $('.monei-button').data('action');
        var payment;
        var formData = {};
        formData.email = $('#email').val();
        formData.phone = $('#phoneNumber').val();
        $.ajax({
          url: url,
          type: 'post',
          dataType: 'json',
          contentType: 'application/json',
          data:JSON.stringify(formData),
          success: async function (data) {
          if (data.error){
            if (data.fieldErrors && data.fieldErrors.emailError){
              $('#email').addClass('is-invalid');
              $('#emailInvalidMessage').html(data.fieldErrors.emailError);
            }
            if (data.fieldErrors && data.fieldErrors.phoneError){
              $('#phoneNumber').addClass('is-invalid');
              $('#phoneInvalidMessage').html(data.fieldErrors.phoneError);
            }            
          }else{
            payment = data.payment;
            if (payment.err){
              console.log(payment.err);
              $('.monei-error.hidden').html(payment.err);
              $('.monei-error.hidden').removeClass('hidden');
            }else{
              const pageType = $('input[name="moneiPageType"]').val();
              if ('redirect'===pageType){
                window.location.assign(payment.nextAction.redirectUrl);
              }else{
                try{
                  const result = await monei.confirmPayment({
                    paymentId: payment.id,
                    fullscreen: 'modal_page_full_screen'===pageType
                    // Set fullscreen payment page
                  }); 
                  if (result.nextAction.redirectUrl){
                    setTimeout(function(){ 
                      window.location.href = result.nextAction.redirectUrl;
                    }, 1000);
                  }else if(result.message){
                    $('.monei-error.hidden').html(result.message);
                    $('.monei-error.hidden').removeClass('hidden');
                  }
                  $.spinner().stop();
                }catch(err){
                  console.log(err);
                  $('.monei-error.hidden').html(err.message);
                  $('.monei-error.hidden').removeClass('hidden');
                }
              }
            }
          } 
          
          },
          error: function (err) {
            if (err.responseJSON.redirectUrl) {
                window.location.href = err.responseJSON.redirectUrl;
            }
            $.spinner().stop();
          }
        });

      } catch (error) {
        console.log(error);
        $('.monei-error.hidden').html(result.message);
        $('.monei-error.hidden').removeClass('hidden');
      } finally {
        $.spinner().stop();
      }
  });
})();