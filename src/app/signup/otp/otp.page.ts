import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileConstants, OTPTemplates, RouterLinks, PreferenceKey } from '@app/app/app.constant';
import { CommonUtilService, Environment } from '@app/services';
import { VerifyOtpRequest, HttpClientError, GenerateOtpRequest, ProfileService, SharedPreferences , AuthService} from 'sunbird-sdk';
import { Location as SbLocation } from '@project-sunbird/client-services/models/location';
import { TncUpdateHandlerService } from '@app/services/handlers/tnc-update-handler.service';
import { Location } from '@angular/common';
import { KendraApiService } from '@app/app/manage-learn/core/services/kendra-api.service';
import { urlConstants } from '@app/app/manage-learn/core/constants/urlConstants';
import { auth,tenantChannelId } from '@app/configuration/configuration';
import { async } from '@angular/core/testing';
@Component({
  selector: 'app-otp',
  templateUrl: './otp.page.html',
  styleUrls: ['./otp.page.scss'],
})
export class OtpPage implements OnInit {
  btnColor = '#8FC4FF';
  public otpInfoForm: FormGroup;
  userData: any;
  appName = '';
  enableResend = true;
  contactNumber = '';
  acceptAgreement = false;
  invalidOtp = false;
  remainingAttempts: any;
  loader: any;
  password:any;
  otp=true;
  skipNavigation: any;
  loginDet: any;
  constructor(
    @Inject('PROFILE_SERVICE') private profileService: ProfileService,
    @Inject('SHARED_PREFERENCES') private preference: SharedPreferences,
    @Inject('AUTH_SERVICE') private authService: AuthService,

    private _fb: FormBuilder,
    private commonUtilService: CommonUtilService,
    private tncUpdateHandlerService: TncUpdateHandlerService,
    private location: Location,
    private kendraService: KendraApiService,
    public router: Router) {
    const extrasState = this.router.getCurrentNavigation().extras.state;
    this.skipNavigation = extrasState;
    this.password=extrasState.password
    this.userData = extrasState.userData;
    this.contactNumber = this.userData?.contactInfo?.phone ? (this.userData?.contactInfo?.phone).replace(/\d(?=\d{4})/g, '*')
      : this.userData?.contactInfo?.email;
  }

  goBack() {
    this.location.back();
  }

  async ngOnInit() {
    this.otpInfoForm =
      this._fb.group({
        otp: ['', Validators.required],
      });

    this.appName = await this.commonUtilService.getAppName();
  }

  async continue() {
    if (this.commonUtilService.networkInfo.isNetworkAvailable) {
      this.loader = await this.commonUtilService.getLoader();
      await this.loader.present();
      let req: VerifyOtpRequest;
      if (this.userData.contactInfo.type === ProfileConstants.CONTACT_TYPE_PHONE) {
        req = {
          key: this.userData.contactInfo.phone,
          type: ProfileConstants.CONTACT_TYPE_PHONE,
          otp: this.otpInfoForm.value.otp,
          ...(this.userData.contactInfo.phone &&
            this.userData.contactInfo.phone.match(/(([a-z]|[A-Z])+[*]+([a-z]*[A-Z]*[0-9]*)*@)|([0-9]+[*]+[0-9]*)+/g) &&
            { userId: this.userData.userId })
        };
      } else {
        req = {
          key: this.userData.contactInfo.email,
          type: ProfileConstants.CONTACT_TYPE_EMAIL,
          otp: this.otpInfoForm.value.otp,
          ...(this.userData.contactInfo &&
            this.userData.contactInfo.email.match(/(([a-z]|[A-Z])+[*]+([a-z]*[A-Z]*[0-9]*)*@)|([0-9]+[*]+[0-9]*)+/g) &&
            { userId: this.userData.userId })
        };
      }
      this.profileService.verifyOTP(req).toPromise()
        .then(() => {
          const locationCodes = [];
          (Object.keys(this.userData.location).map((acc, key) => {
            if (this.userData.location[acc]) {
              const location: SbLocation = this.userData.location[acc] as SbLocation;
              if (location.type) {
                locationCodes.push({
                  type: location.type,
                  code: location.code
                });
              }
            }
          }, {}));
          const profileReq = {
            profileLocation: locationCodes,
            firstName: this.userData.name,
            lastName: '',
            dob: this.userData.dob,
            profileUserTypes: this.userData.profileUserTypes
          };
          const body = {
            "request": {
              "firstName": this.userData.name,
              "organisationId": tenantChannelId,
              "email": this.userData.contactInfo.email,
              "emailVerified": true,
              "username":this.userData.contactInfo.email,
              "password":  this.password.password,
              "dob": this.userData.dob,
              "roles": [
                "PUBLIC"
            ]
          }
          };
          const usercreate = {
            url: urlConstants.API_URLS.CREATE_USER,
            payload: body
          };
         
          this.kendraService.post(usercreate).subscribe(async user => {
            if(user?.result?.response == 'SUCCESS'){
              //  this.commonUtilService.showToast('User Created Successfully');
              // Make the second API call
              // this.router.navigate([RouterLinks.SIGN_IN]);

          const body1 = {
            "request": {
              "username":this.userData.contactInfo.email,
              "password":  this.password.password,
          }
          };       
          const data={
            url: urlConstants.API_URLS.AUTHTOKEN,
            payload: body1
           
          }
         await this.kendraService.post(data).subscribe( async success => {

            console.log("success",success)
             const profileLocation = [];

            const locationLevels = ['state', 'district', 'block', 'cluster', 'school'];

            locationLevels.forEach(level => {
                if (this.userData.location[level]) {
                    profileLocation.push(this.userData.location[level]);
                }
            });

            console.log("this.userData.profileUserTypes",this.userData.profileUserTypes)
             const update ={
              "request": {
                userId: user?.result?.userId,
                profileUserTypes: this.userData.profileUserTypes,
                profileLocation:profileLocation,
                 }
             }
            const userupdate={
            url: urlConstants.API_URLS.USER_UPDATE,
            payload: update,
            }
            await this.kendraService.post(userupdate).subscribe( async upadated => {
              if(upadated.result.response == 'SUCCESS'){
                this.commonUtilService.showToast("User Created Successfully.");
                  this.router.navigate([RouterLinks.SIGN_IN]);
                // location.reload();
              }
            }, error => {
              console.log  ("error 175",error)   
              this.commonUtilService.showToast("User Created Successfully but error while profile update.");
              });
          });
            }
            else if (user?.status == 400) {
              let errorMessage = JSON.parse(user.error).params.errmsg;
              this.commonUtilService.showToast(errorMessage);
          }
          else{
            let errorMessage = JSON.parse(user.error).params.errmsg;
            this.commonUtilService.showToast(errorMessage);
        }
            await this.loader.dismiss();
          
          }, error => {
            console.log  ("error 191",error)   
            });
         
         
        })
        .catch(error => {
          this.loader.dismiss();
          if (HttpClientError.isInstance(error)
            && error.response.responseCode === 400) {

            if (typeof error.response.body === 'object') {
              if (error.response.body.params.err === 'UOS_OTPVERFY0063' &&
                  error.response.body.result.remainingAttempt >= 0) {
                  this.remainingAttempts = error.response.body.result.remainingAttempt;
                  this.otpInfoForm.value.otp = '';
                  this.invalidOtp = true;
                  this.otp = true;
              } else if (error.response.body.params.errmsg === 'Invalid OTP') {
                  this.commonUtilService.showToast(this.commonUtilService.translateMessage('OTP_FAILED'));
                  this.remainingAttempts = error.response.body.result.remainingAttempt;
                  this.otpInfoForm.value.otp = '';
                  this.otp = false;
              } else {
                  this.otp = false;
              }

            }
          }
        });
    } else {
      this.commonUtilService.showToast(this.commonUtilService.translateMessage('INTERNET_CONNECTIVITY_NEEDED'));
    }
  }

  async resendOTP() {
    if (this.commonUtilService.networkInfo.isNetworkAvailable) {
      this.enableResend = !this.enableResend;
      let req: GenerateOtpRequest;
      if (this.userData.contactInfo.type === ProfileConstants.CONTACT_TYPE_PHONE) {
        req = {
          key: this.userData.contactInfo.phone,
          type: ProfileConstants.CONTACT_TYPE_PHONE,
          ...(this.userData.contactInfo &&
            this.userData.contactInfo.match(/(([a-z]|[A-Z])+[*]+([a-z]*[A-Z]*[0-9]*)*@)|([0-9]+[*]+[0-9]*)+/g) &&
            { userId: this.userData.userId, templateId: OTPTemplates.EDIT_CONTACT_OTP_TEMPLATE })
        };
      } else {
        req = {
          key: this.userData.contactInfo.email,
          type: ProfileConstants.CONTACT_TYPE_EMAIL,
          ...(this.userData.contactInfo.email &&
            this.userData.contactInfo.email.match(/(([a-z]|[A-Z])+[*]+([a-z]*[A-Z]*[0-9]*)*@)|([0-9]+[*]+[0-9]*)+/g) &&
            { userId: this.userData.userId, templateId: OTPTemplates.EDIT_CONTACT_OTP_TEMPLATE })
        };
      }
      let loader = await this.commonUtilService.getLoader();
      await loader.present();
      this.profileService.generateOTP(req).toPromise()
        .then(async (success) => {
          this.commonUtilService.showToast(this.commonUtilService.translateMessage('OTP_RESENT'));
          await loader.dismiss();
          this.otp=true;
          this.enableResend = true
          loader = undefined;
        })
        .catch(async (e) => {
          if (loader) {
            this.commonUtilService.showToast(this.commonUtilService.translateMessage('SOMETHING_WENT_WRONG'));
            await loader.dismiss();
            loader = undefined;
          }
        });
    } else {
      this.commonUtilService.showToast(this.commonUtilService.translateMessage('INTERNET_CONNECTIVITY_NEEDED'));
    }
  }

  redirectToLogin() {
    this.router.navigate([RouterLinks.SIGN_IN]);
  }

  changeEvent(event) {
    this.acceptAgreement = event.target.checked;
  }
}
