export interface WPReleaseAPIResponse {
  offers: WPReleaseOffer[]
}

export interface WPReleaseOffer {
  response: sting
  download: string
  locale: string
  packages: {
    full: string
    no_content: boolean
    new_bundled: boolean
    partial: boolean
    rollback: boolean
  }
  current: string
  version: string
  php_version: string
  mysql_version: string
  new_bundled: string
  partial_version: boolean
}
