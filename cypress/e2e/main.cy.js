describe('Visiting the web page', () => {
  it('loads the homepage and verify its contents', () => {
    cy.visit('/');
    cy.contains('Anime Check');
    cy.contains('Top 50 anime characters');
    cy.contains('Data from Jikan API');
    cy.get('input[placeholder="Search Anime..."]').should('exist').and('be.visible');
    cy.contains('Airing Schedule');
    cy.contains('Monday');
    cy.contains('Tuesday');
    cy.contains('Wednesday');
    cy.contains('Thursday');
    cy.contains('Friday');
    cy.contains('Saturday');
    cy.contains('Sunday');
    cy.contains('Prev');
    cy.contains('Next');
    cy.contains('GitHub');
  })
})