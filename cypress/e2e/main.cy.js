describe('Visiting the web page', () => {
  it('loads the homepage and verify its contents', () => {
    cy.visit('/');
    cy.contains('Anime Check');
    cy.contains('GitHub');
    cy.contains('Discord');
    cy.contains('Top 50 anime characters');
    cy.contains('Data from Jikan API');
    cy.get('input[placeholder="Search Anime..."]').should('exist').and('be.visible');
  })
})