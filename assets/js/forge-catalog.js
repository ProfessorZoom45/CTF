(() => {
  const releases = document.getElementById('forge-releases');
  const list = document.getElementById('forge-release-list');
  const status = document.getElementById('forge-release-status');
  const more = document.getElementById('forge-release-more');
  let offset = 0;
  let loading = false;

  function text(parent, tag, value) {
    const element = document.createElement(tag);
    element.textContent = value;
    parent.append(element);
  }

  async function load() {
    if (loading || offset === null) return;
    loading = true;
    more.hidden = true;
    status.textContent = 'Loading Forge releases…';
    try {
      const url = new URL(window.CTF_SUBMISSION_DELIVERY.catalog);
      if (location.origin === url.origin) url.pathname = '/api/forge-catalog';
      url.searchParams.set('offset', offset);
      const response = await fetch(url);
      if (!response.ok) throw Error('Catalog unavailable');
      const data = await response.json();
      for (const release of data.releases) {
        const group = document.createElement('details');
        text(group, 'summary', 'Released ' + new Date(release.publishedAt).toLocaleDateString());
        for (const card of release.cards) {
          text(group, 'h3', card.name);
          text(group, 'p', card.type);
          if (card.rank !== undefined) {
            text(group, 'p', 'Rank ' + card.rank + ' · ' + card.pressure + ' Pressure · ' + card.counterPressure + ' Counter Pressure');
          }
          text(group, 'p', card.text);
          if (card.timingWindow) text(group, 'p', 'Timing: ' + card.timingWindow);
          if (card.resolution) text(group, 'p', card.resolution);
          if (card.materials) text(group, 'p', 'Materials: ' + card.materials.join(' + '));
          if (card.fusionRules) text(group, 'p', card.fusionRules);
        }
        list.append(group);
      }
      offset = data.next;
      status.textContent = list.children.length ? '' : 'No Forge cards have been released yet.';
      more.textContent = 'Load more Forge cards';
      more.hidden = offset === null;
    } catch {
      status.textContent = 'Forge releases are unavailable right now.';
      more.textContent = 'Retry';
      more.hidden = false;
    } finally {
      loading = false;
    }
  }

  releases.addEventListener('toggle', () => { if (releases.open && !list.children.length) load(); });
  more.addEventListener('click', load);
})();
