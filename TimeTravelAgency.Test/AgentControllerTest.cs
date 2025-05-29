using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using TimeTravelAgency.Application.Cmd;
using TimeTravelAgency.Application.Dto;
using Xunit;
using Xunit.Abstractions;

namespace TimeTravelAgency.Test;

public class AgentControllerTests
{
    private readonly ITestOutputHelper _testOutputHelper;
    private const string BaseUrl = "http://localhost:5000/api/agent";

    public AgentControllerTests(ITestOutputHelper testOutputHelper)
    {
        _testOutputHelper = testOutputHelper;
    }

    [Fact]
    public async Task GetAllAgents_ReturnsOk()
    {
        var client = new HttpClient();

        var response = await client.GetAsync(BaseUrl);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetByGuid_ReturnsOkOrNotFound()
    {
        var client = new HttpClient();

        // Alle Agenten abrufen
        var getAllResponse = await client.GetAsync(BaseUrl);
        Assert.Equal(HttpStatusCode.OK, getAllResponse.StatusCode);

        var agents = await getAllResponse.Content.ReadFromJsonAsync<List<AgentDto>>();
        Assert.NotNull(agents);
        Assert.NotEmpty(agents);

        var existingAgent = agents[0];
        Assert.NotEqual(Guid.Empty, existingAgent.guid);

        _testOutputHelper.WriteLine($"Using existing agent: {existingAgent.guid}");

        // Get by existing GUID: OK
        var getResponse = await client.GetAsync($"{BaseUrl}/{existingAgent.guid}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        // Get by random GUID: NotFound
        var notFoundResponse = await client.GetAsync($"{BaseUrl}/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, notFoundResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteAgent_DeletesSuccessfullyOrReturnsNotFound()
    {
        var client = new HttpClient();

        // Alle Agenten abrufen
        var getAllResponse = await client.GetAsync(BaseUrl);
        Assert.Equal(HttpStatusCode.OK, getAllResponse.StatusCode);

        var agents = await getAllResponse.Content.ReadFromJsonAsync<List<AgentDto>>();
        Assert.NotNull(agents);
        Assert.NotEmpty(agents);

        var existingAgent = agents[0];
        Assert.NotEqual(Guid.Empty, existingAgent.guid);

        _testOutputHelper.WriteLine($"Deleting agent: {existingAgent.guid}");

        // Erster Löschversuch: OK
        var deleteResponse = await client.DeleteAsync($"{BaseUrl}/{existingAgent.guid}");
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

        // Zweiter Löschversuch: NotFound
        var deleteAgainResponse = await client.DeleteAsync($"{BaseUrl}/{existingAgent.guid}");
        Assert.Equal(HttpStatusCode.NotFound, deleteAgainResponse.StatusCode);
    }
}