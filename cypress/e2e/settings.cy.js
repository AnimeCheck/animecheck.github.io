describe('Settings modal interactions', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Opens the settings modal when the gear icon is clicked', () => {
    cy.get('#settings-btn').click();
    cy.get('#settingsModal').should('be.visible');
  });

  it('Opens the settings modal and clicking the tabs', () => {
    cy.get('#settings-btn').click();
    cy.get('#settingsModal').should('be.visible');
    // Clicking on the tabs
    cy.contains('button', 'Data').click();
    cy.get('#data-tab-settings').should('be.visible');
    cy.contains('button', 'General').click();
    cy.get('#general-tab-settings').should('be.visible');
  });

  it('Closes the settings modal', () => {
    cy.get('#settings-btn').click();

    // Dealing with modal with fade animation
    cy.get('#settingsModal').should('have.class', 'show');
    cy.wait(500);

    // Close the modal
    cy.get('#settingsModal .btn-close').click();
    cy.get('#settingsModal').should('not.have.class', 'show');
  });
})