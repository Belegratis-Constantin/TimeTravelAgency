namespace TimeTravelAgency.Application.Model;

public class CriticalTrip : Trip
{
    // Constructors

    public CriticalTrip(LicensedAgent licensedSupportAgent, DateTime dateInRealLife, LicensedAgent licensedAgent, int managerId, string? tripName=null)
        : base(dateInRealLife, licensedAgent, managerId, tripName)
    {
        LicensedSupportAgent = licensedSupportAgent;
    }
    
#pragma warning disable CS8618
    protected CriticalTrip() { }
#pragma warning restore CS8618
    
    
    // Properties
    
    LicensedAgent LicensedSupportAgent { get; set; }
}