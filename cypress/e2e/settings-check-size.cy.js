describe('Settings: Check Size button', () => {
  beforeEach(() => {
    cy.visit('/');

    // Click on Settings button
    cy.get('#settings-btn').click();
    cy.get('#settingsModal').should('be.visible');
    // Click on the Data tab
    cy.contains('button', 'Data').click();
    // Click on Check Size button
    cy.get('#checkStorageBtn').click();
    cy.get('#globalToast').should('be.visible');
  });

  it('Clicking on Check Size button', () => {
    cy.get('#globalToast').contains('Storage size:');
  });

  it('Simulate the minimum', () => {
    cy.window().then(win => {
      const body = win.document.getElementById("globalToastBody");
      body.innerHTML = `
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <i class="bi bi-hdd"></i>
          <div>Storage size: </div><div>0.00 MB / 5.00 MB</div>
        </div>
      `;
    });

    // Extract the text and test the number
    cy.get('#globalToast').invoke('text').then(text => {
      const match = text.match(/([\d.]+)\s*MB\s*\/\s*5\.00\s*MB/);

      expect(match, 'matched MB usage').to.not.be.null;

      const usedMB = parseFloat(match[1]);
      expect(usedMB).to.be.within(0, 5);
    });
  });

  it('Simulate the maximum', () => {
    cy.window().then(win => {
      const body = win.document.getElementById("globalToastBody");
      body.innerHTML = `
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <i class="bi bi-hdd"></i>
          <div>Storage size: </div><div>5.00 MB / 5.00 MB</div>
        </div>
      `;
    });

    // Extract the text and test the number
    cy.get('#globalToast').invoke('text').then(text => {
      const match = text.match(/([\d.]+)\s*MB\s*\/\s*5\.00\s*MB/);

      expect(match, 'matched MB usage').to.not.be.null;

      const usedMB = parseFloat(match[1]);
      expect(usedMB).to.be.within(0, 5);
    });
  });
})