// adapted from https://github.com/metabrainz/musicbrainz-server/blob/f43bfae03569002bef244e7f6b0a86a9d49d15c9/lib/MusicBrainz/Server/Validation.pm

export function formatISWC(iswc: string) {
  return iswc.replace(/T(\d{3})(\d{3})(\d{3})(\d)/, 'T-$1.$2.$3-$4');
}
