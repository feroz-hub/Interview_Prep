using System;

//What is Abstraction?
namespace What_is_Abstraction
{
    class Program
    {
        static void Main(string[] args)
        {
            String name = "InterviewHappy";

            name.Substring(8);

            Console.WriteLine(name);

            Console.ReadLine();
        }

        public abstract class EmployeeSalary
        {
            public int Experience { get; set; }

            public void CalculateSalary()
            {
                int salary = Experience * 300000;
            }

            public abstract void CalculateBonus();             
        }
    }
}
