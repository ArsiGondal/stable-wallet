export const getEmailHTML = (firstname, lastname, amount, address, otp) => {
  return `<html lang="en">

    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email</title>
    </head>
    
    <body style="background-color:#ffffff;" >
    <div style="margin:0px; padding:0px; box-sizing: border-box; font-family: sans-serif; background-color: #e7e6e6;">
        <div style="width: 700px;   background-color:#ffffff; margin: 0px auto;">
            <div class="header" style="text-align:center; padding: 25px; background-color: #F9F9F9; ">
                <img  src="https://api-live.stableonegroup.com/media-upload/mediaFiles/logo/f32c92b10b20010764f1022ab4086ee16a.png" alt=""> 
            </div>
               <div class="emaiData" style="padding: 25px;">
                 <div class="headText" style="font-size:28px; font-weight:500; line-height: 28px; margin: 0px;">
                    <p >Confirm Your Withdrawal</p> </div>
                <hr style="color:B4B4B4">
                <div class="content">
                    <p>Dear ${firstname} ${lastname},
                        <br> You've Initiated a request to withdraw ${amount} to the following: </p>
                </div>
                <div class="address" style="background-color:#F9F9F9; text-align: center; padding: 1px;">
                    <p style="font: size 18px; font-weight:400; line-height:18px; color:#666666 ;" > <strong>Address:</strong> ${address}
                    </p> 
            </div>
        
            <div class="otp">
                <p style="font-size:18px;font-weight:400;line-height:18px; color: #2E2E2E;">Your OTP is:</p>
                <p style="font-size:28px; font-weight:600; color:#2E2E2E ">${otp}</p>
            </div>
        
            <div class="alert">

                <p style="font-size:18px;font-weight:400;line-height:22px; color: #2E2E2E;">The verification code will be valid for 2 minutes. Please do not share code with anyone.

                </p>
            </div>
        
               </div>
               <div class="footer" style="background-color:#E4EDFF; text-align: center; ;">
                <p style="font-size: 22px; line-height: 28px; font-weight: 600;padding-top: 10px;">Follow Us</p>
                <div>
                  <span style="padding:10px"> 
                   <a href="https://twitter.com/stableonegroup" target="_blank" style="color:#e4edff;text-decoration: none;">
                    <img src="https://api-live.stableonegroup.com/media-upload/mediaFiles/logo/cd39c346d93fb148facf4c849259ac8b.png" alt=""></img>
                   </a>
                  </span>
                   <a href="https://t.me/Stablefundofficial" target="_blank" style="color:#e4edff">
                    <img src="https://api-live.stableonegroup.com/media-upload/mediaFiles/logo/f27ceb610a51075c891109a5afc23684b59.png" alt=""></img>
                   </a>
                   </span>
                   <span style="padding:10px">
                       <a href="https://www.instagram.com/stableonegroup" target="_blank"  style="color:#e4edff;text-decoration: none;">
                            <img src="https://api-live.stableonegroup.com/media-upload/mediaFiles/logo/4b5954b97e98e9e8e27dfc4f24536b03.png" alt=""></img>
                        </a>
                        </span>
                </div>
                <h4 style="font-size: 16px; line-height: 18px; font-weight: 500; padding-bottom: 10px;">Ⓒ 2022 StableFund, All Rights Reserved</h4>
            </div>
        </div>
        </div>
    </body>
    </html>`;
};
