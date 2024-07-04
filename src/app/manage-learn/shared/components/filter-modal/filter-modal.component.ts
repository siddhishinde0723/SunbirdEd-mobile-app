import { Component, Input, OnInit } from '@angular/core';
import { LoaderService, UtilsService } from '@app/app/manage-learn/core';
import { KendraApiService } from '@app/app/manage-learn/core/services/kendra-api.service';
import { UnnatiDataService } from '@app/app/manage-learn/core/services/unnati-data.service';
import { ModalController, Platform } from '@ionic/angular';
import * as _ from 'underscore';
import { urlConstants } from '@app/app/manage-learn/core/constants/urlConstants';
import { Location } from '@angular/common';

@Component({
  selector: 'app-filter-modal',
  templateUrl: './filter-modal.component.html',
  styleUrls: ['./filter-modal.component.scss'],
})
export class FilterModalComponent implements OnInit {
  page = 1;
  limit = 15;
  entityTypes: any;
  selectedType = 'school';
  dataList: any = [];
  @Input() type: string;
  @Input() entityId: string;
  searchText: any;
  count: any;

  constructor(
    private loader: LoaderService,
    // public reportSrvc: ReportsService,
    public kendraSrvc: KendraApiService,
    public unnatiSrvc: UnnatiDataService,
    private modalCtrl: ModalController,
    private utils: UtilsService,
    private location: Location,
    public platform: Platform
  ) {
    this.search = _.debounce(this.search, 500);
  }

  ngOnInit() {
    this.search('');
  }

  typeChange(e) {
    this.selectedType = e.detail.value;
    this.search(this.searchText);
  }

  search(searchText) {
    if (searchText == null || searchText == undefined) {
      searchText = '';
    }
    this.searchText = searchText;
    this.page = 1; // Reset to the first page for a new search
    this.dataList = []; // Clear dataList for a new search
    this.type == 'entity' ? this.serachEntity(searchText) : this.searchProgramByEntity(searchText);
  }

  async searchProgramByEntity(searchText: any) {
    this.loader.startLoader();
    let payload = await this.utils.getProfileData();

    const config = {
      url: `${urlConstants.API_URLS.GET_PROGRAM_BY_ENTITY}?search=${encodeURIComponent(searchText)}&page=${this.page}&limit=${this.limit}`,
      payload: payload,
    };

    this.unnatiSrvc.post(config).subscribe(
      (data) => {
        this.loader.stopLoader();
        this.dataList = this.dataList.concat(data.result.data);
        console.log("this.dataList", this.dataList);
      },
      (error) => {
        this.loader.stopLoader();
      }
    );
  }

  async serachEntity(searchText: any) {
    // Implement this method similar to searchProgramByEntity if needed
  }

  getEntityTypes() {
    this.utils.getMandatoryEntitiesList().then((data) => {
      console.log(data, 'data 109');
      this.entityTypes = data;
    });
  }

  dismissModal(data?) {
    this.modalCtrl.dismiss(data);
  }

  loadData(event) {
    setTimeout(() => {
      event.target.complete();
      this.page++;
      this.type == 'entity' ? this.serachEntity(this.searchText) : this.searchProgramByEntity(this.searchText);
      if (this.dataList.length == this.count) {
        event.target.disabled = true;
      }
    }, 500);
  }
}

